"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Sales Delivery Actions (Penjualan)
 */
export async function createSalesDeliveryAction(data: {
    recipient: string;
    buyerName: string; poNumber?: string;
    warehouseId: string;
    salesPerson?: string;
    totalDiscount?: number;
    taxRate?: number;
    createdAt?: Date;
    items: { productId: string; quantity: number; salesPrice: number; discount?: number; uom?: string; vendorName?: string }[];
}) {
    const txDate = data.createdAt || new Date();
    const day = String(txDate.getDate()).padStart(2, '0');
    const month = String(txDate.getMonth() + 1).padStart(2, '0');
    const year = txDate.getFullYear();
    const dateStr = `${day}${month}${year}`;

    return await prisma.$transaction(async (tx: any) => {
        const prefix = `KB-TRN-${dateStr}-`;
        const latest = await tx.salesDelivery.findFirst({
            where: { deliveryNumber: { startsWith: prefix } },
            orderBy: { deliveryNumber: 'desc' }
        });

        let nextNum = 1;
        if (latest) {
            const parts = latest.deliveryNumber.split('-');
            const lastSeq = parseInt(parts[parts.length - 1]);
            if (!isNaN(lastSeq)) nextNum = lastSeq + 1;
        }
        const deliveryNumber = `${prefix}${String(nextNum).padStart(3, '0')}`;

        const session = await getServerSession(authOptions) as any;
        const delivery = await tx.salesDelivery.create({
            data: {
                deliveryNumber: deliveryNumber,
                recipient: data.recipient,
                buyerName: data.buyerName,
                poNumber: data.poNumber,
                warehouseId: data.warehouseId,
                salesPerson: data.salesPerson,
                createdAt: txDate,
                createdById: session?.user?.id,
                items: {
                    create: data.items.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        salesPrice: item.salesPrice as any,
                        uom: item.uom,
                        vendorName: item.vendorName || "UMUM"
                    }))
                }
            },
            include: { items: true }
        });

        let grossAmount = 0;
        let totalItemDiscounts = 0;
        data.items.forEach(i => {
            const lineGross = i.quantity * i.salesPrice;
            const lineDiscount = Number(i.discount || 0);
            grossAmount += lineGross;
            totalItemDiscounts += lineDiscount;
        });

        const subtotal = Math.round(grossAmount - totalItemDiscounts);
        const totalDiscountNominal = Math.round(Number(data.totalDiscount) || 0);
        const taxRatePercent = Number(data.taxRate) || 0;
        const taxAmount = Math.round((subtotal - totalDiscountNominal) * (taxRatePercent / 100));
        const grandTotal = Math.round(subtotal - totalDiscountNominal + taxAmount);

        await tx.salesDelivery.update({
            where: { id: delivery.id },
            data: {
                subtotal: subtotal,
                totalDiscount: totalDiscountNominal,
                taxRate: taxRatePercent,
                taxAmount: taxAmount,
                grandTotal: grandTotal
            }
        });

        for (const inputItem of data.items) {
            if (inputItem.discount && inputItem.discount > 0) {
                await tx.salesDeliveryItem.updateMany({
                    where: { deliveryId: delivery.id, productId: inputItem.productId },
                    data: { discount: inputItem.discount }
                });
            }
        }

        for (const item of data.items) {
            const vendorName = item.vendorName || "UMUM";
            const currentStock = await tx.stock.findUnique({
                where: {
                    productId_warehouseId_vendorName: {
                        productId: item.productId,
                        warehouseId: data.warehouseId,
                        vendorName: vendorName
                    }
                }
            });

            if (!currentStock || currentStock.quantity < item.quantity) {
                const product = await tx.product.findUnique({ where: { id: item.productId } });
                throw new Error(`Stok tidak mencukupi untuk produk ${product?.name || item.productId} dari vendor ${vendorName}`);
            }

            await tx.stock.update({
                where: {
                    productId_warehouseId_vendorName: {
                        productId: item.productId,
                        warehouseId: data.warehouseId,
                        vendorName: vendorName
                    }
                },
                data: { quantity: { decrement: item.quantity } }
            });

            await tx.stockMovement.create({
                data: {
                    productId: item.productId,
                    warehouseId: data.warehouseId,
                    vendorName: vendorName,
                    quantity: -item.quantity,
                    type: "SALE",
                    reference: deliveryNumber
                }
            });
        }

        revalidatePath("/sales");
        revalidatePath("/warehouse");
        revalidatePath("/finance");
        revalidatePath("/");

        return { success: true, deliveryNumber };
    });
}

export async function updateSalesDeliveryAction(id: string, data: {
    recipient: string;
    buyerName: string; poNumber?: string;
    warehouseId: string;
    salesPerson?: string;
    totalDiscount?: number;
    taxRate?: number;
    createdAt?: Date;
    items: { productId: string; quantity: number; salesPrice: number; discount?: number; uom?: string; vendorName?: string }[];
}) {
    return await prisma.$transaction(async (tx: any) => {
        const oldDelivery = await tx.salesDelivery.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!oldDelivery) throw new Error("Delivery not found");

        for (const item of oldDelivery.items) {
            await tx.stock.update({
                where: {
                    productId_warehouseId_vendorName: {
                        productId: item.productId,
                        warehouseId: oldDelivery.warehouseId,
                        vendorName: item.vendorName
                    }
                },
                data: { quantity: { increment: item.quantity } }
            });
        }

        await tx.salesDeliveryItem.deleteMany({ where: { deliveryId: id } });

        const txDate = data.createdAt || new Date();
        await tx.salesDelivery.update({
            where: { id },
            data: {
                recipient: data.recipient,
                buyerName: data.buyerName,
                poNumber: data.poNumber,
                warehouseId: data.warehouseId,
                salesPerson: data.salesPerson,
                createdAt: txDate
            }
        });

        for (const item of data.items) {
            const vendorName = item.vendorName || "UMUM";
            await tx.salesDeliveryItem.create({
                data: {
                    deliveryId: id,
                    productId: item.productId,
                    quantity: item.quantity,
                    salesPrice: item.salesPrice as any,
                    uom: item.uom,
                    vendorName: vendorName
                }
            });

            await tx.stock.update({
                where: {
                    productId_warehouseId_vendorName: {
                        productId: item.productId,
                        warehouseId: data.warehouseId,
                        vendorName: vendorName
                    }
                },
                data: { quantity: { decrement: item.quantity } }
            });

            await tx.stockMovement.create({
                data: {
                    productId: item.productId,
                    warehouseId: data.warehouseId,
                    vendorName: vendorName,
                    quantity: -item.quantity,
                    type: "SALE_UPDATE",
                    reference: oldDelivery.deliveryNumber
                }
            });
        }

        let grossAmount = 0;
        let totalItemDiscounts = 0;
        data.items.forEach(i => {
            const lineGross = i.quantity * i.salesPrice;
            const lineDiscount = Number(i.discount || 0);
            grossAmount += lineGross;
            totalItemDiscounts += lineDiscount;
        });

        const subtotal = Math.round(grossAmount - totalItemDiscounts);
        const totalDiscountNominal = Math.round(Number(data.totalDiscount) || 0);
        const taxRatePercent = Number(data.taxRate) || 0;
        const taxAmount = Math.round((subtotal - totalDiscountNominal) * (taxRatePercent / 100));
        const grandTotal = Math.round(subtotal - totalDiscountNominal + taxAmount);

        await tx.salesDelivery.update({
            where: { id },
            data: {
                subtotal: subtotal,
                totalDiscount: totalDiscountNominal,
                taxRate: taxRatePercent,
                taxAmount: taxAmount,
                grandTotal: grandTotal
            }
        });

        for (const inputItem of data.items) {
            if (inputItem.discount && inputItem.discount > 0) {
                await tx.salesDeliveryItem.updateMany({
                    where: { deliveryId: id, productId: inputItem.productId },
                    data: { discount: inputItem.discount }
                });
            }
        }

        revalidatePath("/sales");
        revalidatePath("/warehouse");
        revalidatePath("/finance");
        revalidatePath("/");

        return { success: true };
    });
}

export async function deleteSalesDeliveryAction(id: string) {
    return await prisma.$transaction(async (tx: any) => {
        const delivery = await tx.salesDelivery.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!delivery) throw new Error("Delivery not found");

        for (const item of delivery.items) {
            await tx.stock.update({
                where: {
                    productId_warehouseId_vendorName: {
                        productId: item.productId,
                        warehouseId: delivery.warehouseId,
                        vendorName: item.vendorName
                    }
                },
                data: { quantity: { increment: item.quantity } }
            });

            await tx.stockMovement.create({
                data: {
                    productId: item.productId,
                    warehouseId: delivery.warehouseId,
                    vendorName: item.vendorName,
                    quantity: item.quantity,
                    type: "SALE_DELETE",
                    reference: delivery.deliveryNumber
                }
            });
        }

        await tx.salesDeliveryItem.deleteMany({ where: { deliveryId: id } });
        await tx.salesDelivery.delete({ where: { id } });

        revalidatePath("/sales");
        revalidatePath("/warehouse");
        revalidatePath("/finance");
        revalidatePath("/");

        return { success: true };
    });
}

/**
 * CORTEX EXPORT: Get All Sales data encoded in XML
 */
export async function getCortexXmlContentAction() {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user?.id) throw new Error("Unauthorized");

    const isAdmin = session.user.role?.toUpperCase() === "ADMIN";
    const userFilter = isAdmin ? {} : { createdById: session.user.id };

    const allSales = await prisma.salesDelivery.findMany({
        where: userFilter,
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' }
    });

    return generateCortexXml(allSales);
}

function generateCortexXml(sales: any[]) {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<SalesData>\n`;
    sales.forEach(s => {
        xml += `  <Invoice>\n`;
        xml += `    <Number>${s.deliveryNumber}</Number>\n`;
        xml += `    <Date>${s.date?.toISOString()}</Date>\n`;
        xml += `    <Customer>${s.buyerName}</Customer>\n`;
        xml += `    <GrandTotal>${s.grandTotal}</GrandTotal>\n`;
        xml += `    <Items>\n`;
        s.items.forEach((item: any) => {
            xml += `      <Item>\n`;
            xml += `        <SKU>${item.product?.sku}</SKU>\n`;
            xml += `        <Name>${item.product?.name}</Name>\n`;
            xml += `        <Qty>${item.quantity}</Qty>\n`;
            xml += `        <Price>${item.salesPrice}</Price>\n`;
            xml += `      </Item>\n`;
        });
        xml += `    </Items>\n`;
        xml += `  </Invoice>\n`;
    });
    xml += `</SalesData>`;
    return xml;
}

/**
 * SALES RETURN: Create Return Request
 */
export async function createSalesReturnAction(data: {
    deliveryId: string;
    items: { productId: string; quantity: number; reason: string; deliveryItemId?: string }[];
    notes?: string;
}) {
    return await prisma.$transaction(async (tx: any) => {
        const today = new Date();
        const dateStr = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
        const prefix = `SRET-${dateStr}-`;
        const latest = await tx.salesReturn.findFirst({
            where: { returnNumber: { startsWith: prefix } },
            orderBy: { returnNumber: 'desc' }
        });

        let nextNum = 1;
        if (latest) {
            const parts = latest.returnNumber.split('-');
            const lastSeq = parseInt(parts[parts.length - 1]);
            if (!isNaN(lastSeq)) nextNum = lastSeq + 1;
        }
        const returnNumber = `${prefix}${String(nextNum).padStart(3, '0')}`;

        const session = await getServerSession(authOptions) as any;
        const ret = await tx.salesReturn.create({
            data: {
                returnNumber,
                deliveryId: data.deliveryId,
                notes: data.notes,
                createdById: session?.user?.id,
                items: {
                    create: data.items.map(i => ({
                        productId: i.productId,
                        deliveryItemId: i.deliveryItemId,
                        quantity: i.quantity,
                        reason: i.reason
                    }))
                }
            }
        });

        // Update Stock (Increment because goods come back)
        const delivery = await tx.salesDelivery.findUnique({
            where: { id: data.deliveryId },
            include: { items: true }
        });

        if (delivery) {
            for (const item of data.items) {
                // Find vendorName from the original delivery item
                const originalItem = delivery.items.find((di: any) => di.productId === item.productId);
                const vendorName = originalItem?.vendorName || "UMUM";

                await tx.stock.upsert({
                    where: {
                        productId_warehouseId_vendorName: {
                            productId: item.productId,
                            warehouseId: delivery.warehouseId,
                            vendorName: vendorName
                        }
                    },
                    update: { quantity: { increment: item.quantity } },
                    create: {
                        productId: item.productId,
                        warehouseId: delivery.warehouseId,
                        vendorName: vendorName,
                        quantity: item.quantity
                    }
                });

                await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        warehouseId: delivery.warehouseId,
                        vendorName: vendorName,
                        quantity: item.quantity,
                        type: "ADJUSTMENT",
                        reference: returnNumber
                    }
                });
            }
        }

        revalidatePath("/sales");
        revalidatePath("/finance");
        revalidatePath("/warehouse");
        return ret;
    });
}

/**
 * SALES RETURN: Verify Return by Finance
 */
export async function verifySalesReturnAction(id: string) {
    const session = await getServerSession(authOptions) as any;
    return await prisma.$transaction(async (tx: any) => {
        const ret = await tx.salesReturn.findUnique({
            where: { id },
            include: {
                delivery: { include: { items: true } },
                items: true
            }
        });

        if (!ret || ret.status !== "PENDING") throw new Error("Invalid or already verified return");

        let totalValue = 0;
        ret.items.forEach((retItem: any) => {
            const deliveryItem = ret.delivery.items.find((i: any) => i.productId === retItem.productId);
            if (deliveryItem) {
                totalValue += (retItem.quantity * Number(deliveryItem.salesPrice));
            }
        });

        await tx.salesReturn.update({
            where: { id },
            data: { status: "VERIFIED_BY_FINANCE" }
        });

        const customer = await tx.customer.findFirst({ where: { name: ret.delivery.buyerName } });
        if (customer) {
            await tx.customer.update({
                where: { id: customer.id },
                data: { balance: { decrement: totalValue } }
            });
        }

        const arAccount = await tx.financeAccount.findUnique({ where: { code: '105' } }); // Piutang
        const salesAccount = await tx.financeAccount.findUnique({ where: { code: '401' } }); // Pendapatan Penjualan

        if (arAccount && salesAccount) {
            await tx.journalEntry.create({ data: { description: `Retur Penjualan (Potongan Piutang): ${ret.returnNumber}`, amount: totalValue as any, type: "CREDIT", accountId: arAccount.id, date: new Date(), createdById: session?.user?.id } });
            await tx.journalEntry.create({ data: { description: `Retur Penjualan (Potongan Pendapatan): ${ret.returnNumber}`, amount: totalValue as any, type: "DEBIT", accountId: salesAccount.id, date: new Date(), createdById: session?.user?.id } });
        }

        revalidatePath("/finance");
        revalidatePath("/");
        return { success: true };
    });
}

/**
 * SALES RETURN: Delete Return
 */
export async function deleteSalesReturnAction(id: string) {
    return await prisma.$transaction(async (tx: any) => {
        const ret = await tx.salesReturn.findUnique({
            where: { id },
            include: { items: { include: { deliveryItem: true } }, delivery: true }
        });
        if (!ret) throw new Error("Return not found");

        // Revert Stock (Decrement because it was added back during return)
        for (const item of ret.items) {
            const vendorName = item.deliveryItem?.vendorName || "UMUM";
            await tx.stock.upsert({
                where: {
                    productId_warehouseId_vendorName: {
                        productId: item.productId,
                        warehouseId: ret.delivery.warehouseId,
                        vendorName: vendorName
                    }
                },
                update: { quantity: { decrement: item.quantity } },
                create: {
                    productId: item.productId,
                    warehouseId: ret.delivery.warehouseId,
                    vendorName: vendorName,
                    quantity: -item.quantity
                }
            });

            await tx.stockMovement.deleteMany({
                where: { reference: ret.returnNumber, productId: item.productId }
            });
        }

        await tx.salesReturnItem.deleteMany({ where: { salesReturnId: id } });
        await tx.salesReturn.delete({ where: { id } });

        revalidatePath("/sales");
        revalidatePath("/finance");
        revalidatePath("/warehouse");
    });
}

/**
 * SALES RETURN: Update Return
 */
export async function updateSalesReturnAction(id: string, data: {
    items: { productId: string; quantity: number; reason: string; deliveryItemId?: string }[];
    notes?: string;
}) {
    return await prisma.$transaction(async (tx: any) => {
        const ret = await tx.salesReturn.findUnique({
            where: { id },
            include: { items: { include: { deliveryItem: true } }, delivery: true }
        });
        if (!ret) throw new Error("Return not found");
        if (ret.status === "VERIFIED_BY_FINANCE") throw new Error("Cannot edit verified return");

        // 1. Revert Old Stock (Decrement because it was incremented)
        for (const oldItem of ret.items) {
            const vendorName = oldItem.deliveryItem?.vendorName || "UMUM";
            await tx.stock.upsert({
                where: {
                    productId_warehouseId_vendorName: {
                        productId: oldItem.productId,
                        warehouseId: ret.delivery.warehouseId,
                        vendorName: vendorName
                    }
                },
                update: { quantity: { decrement: oldItem.quantity } },
                create: {
                    productId: oldItem.productId,
                    warehouseId: ret.delivery.warehouseId,
                    vendorName: vendorName,
                    quantity: -oldItem.quantity
                }
            });
        }

        // 2. Clear Old Items & Old movements
        await tx.salesReturnItem.deleteMany({ where: { salesReturnId: id } });
        await tx.stockMovement.deleteMany({ where: { reference: ret.returnNumber } });

        // 3. Apply New Stock & Create New Items
        for (const newItem of data.items) {
            const originalItem = await tx.salesDeliveryItem.findFirst({
                where: { deliveryId: ret.deliveryId, productId: newItem.productId }
            });
            const vendorName = originalItem?.vendorName || "UMUM";

            await tx.stock.upsert({
                where: {
                    productId_warehouseId_vendorName: {
                        productId: newItem.productId,
                        warehouseId: ret.delivery.warehouseId,
                        vendorName: vendorName
                    }
                },
                update: { quantity: { increment: newItem.quantity } },
                create: {
                    productId: newItem.productId,
                    warehouseId: ret.delivery.warehouseId,
                    vendorName: vendorName,
                    quantity: newItem.quantity
                }
            });

            await tx.salesReturnItem.create({
                data: {
                    salesReturnId: id,
                    productId: newItem.productId,
                    deliveryItemId: newItem.deliveryItemId || originalItem?.id,
                    quantity: newItem.quantity,
                    reason: newItem.reason
                }
            });

            // Create New Stock Movement
            await tx.stockMovement.create({
                data: {
                    productId: newItem.productId,
                    warehouseId: ret.delivery.warehouseId,
                    vendorName: vendorName,
                    quantity: newItem.quantity,
                    type: "ADJUSTMENT",
                    reference: ret.returnNumber
                }
            });
        }

        await tx.salesReturn.update({
            where: { id },
            data: { notes: data.notes }
        });

        revalidatePath("/sales");
        revalidatePath("/warehouse");
    });
}

/**
 * SALES: Create Manual Sales
 */
export async function createManualSalesAction(data: {
    deliveryNumber: string;
    buyerName: string;
    recipient: string;
    warehouseId: string;
    salesPerson: string;
    items: { productId: string; quantity: number }[];
}) {
    const session = await getServerSession(authOptions) as any;
    if (!session) throw new Error("Unauthorized");

    const result = await prisma.$transaction(async (tx: any) => {
        // 1. Create Delivery
        const delivery = await tx.salesDelivery.create({
            data: {
                deliveryNumber: data.deliveryNumber,
                buyerName: data.buyerName,
                recipient: data.recipient,
                warehouseId: data.warehouseId,
                salesPerson: data.salesPerson,
                createdById: session.user.id,
                items: {
                    create: data.items.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity
                    }))
                }
            }
        });

        // 2. Update Stock and create Movements
        for (const item of data.items) {
            // Update stock
            await tx.stock.updateMany({
                where: {
                    productId: item.productId,
                    warehouseId: data.warehouseId,
                    vendorName: "UMUM" // Default for manual
                },
                data: {
                    quantity: { decrement: item.quantity }
                }
            });

            // Create movement
            await tx.stockMovement.create({
                data: {
                    productId: item.productId,
                    warehouseId: data.warehouseId,
                    quantity: -item.quantity,
                    type: "SALE",
                    reference: `MANUAL-${data.deliveryNumber}`
                }
            });
        }

        return delivery;
    });

    const { serializeDecimal } = await import("@/lib/utils");
    revalidatePath("/sales");
    revalidatePath("/warehouse");
    return serializeDecimal(result);
}
