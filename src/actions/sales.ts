"use server";

import { revalidatePath } from "next/cache";

/**
 * SALES ACTIONS
 * Entry points for sales operations.
 * Use dynamic imports for services to satisfy build boundaries.
 */

export async function createSalesDeliveryAction(data: any) {
    try {
        const { getAuthOptions } = require("@/lib/auth");
        const { getServerSession } = require("next-auth");
        const { createSalesDeliveryService } = require("@/lib/services/sales-service");

        const session = (await getServerSession(getAuthOptions())) as any;
        if (!session?.user?.id) throw new Error("Unauthorized");

        return await createSalesDeliveryService(data, session.user.id);
    } catch (err: any) {
        console.error("[createSalesDeliveryAction] CRITICAL ERROR:", err);
        return { error: err.message || "An unexpected error occurred at the server level." };
    }
}

export async function updateSalesDeliveryAction(id: string, data: any) {
    try {
        const { getAuthOptions } = require("@/lib/auth");
        const { getServerSession } = require("next-auth");
        const { updateSalesDeliveryService } = require("@/lib/services/sales-service");

        const session = (await getServerSession(getAuthOptions())) as any;
        if (!session?.user?.id) throw new Error("Unauthorized");

        return await updateSalesDeliveryService(id, data, session.user.id);
    } catch (err: any) {
        console.error("[updateSalesDeliveryAction] CRITICAL ERROR:", err);
        return { error: err.message || "An unexpected error occurred at the server level." };
    }
}

export async function deleteSalesDeliveryAction(id: string) {
    const { getAuthOptions } = require("@/lib/auth");
    const { getServerSession } = require("next-auth");
    const { deleteSalesDeliveryService } = require("@/lib/services/sales-service");

    const session = (await getServerSession(getAuthOptions())) as any;
    if (!session?.user?.id) throw new Error("Unauthorized");

    return await deleteSalesDeliveryService(id);
}

export async function getCortexXmlContentAction() {
    const { getAuthOptions } = require("@/lib/auth");
    const { getServerSession } = require("next-auth");
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    const session = (await getServerSession(getAuthOptions())) as any;
    if (!session?.user?.id) throw new Error("Unauthorized");

    const isAdmin = session.user.role?.toUpperCase() === "ADMIN";
    const userFilter = isAdmin ? {} : { createdById: session.user.id };

    const allSales = await prisma.salesDelivery.findMany({
        where: userFilter,
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' }
    });

    const generateCortexXml = (sales: any[]) => {
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
    };

    return generateCortexXml(allSales);
}

export async function createSalesReturnAction(data: any) {
    const { getAuthOptions } = require("@/lib/auth");
    const { getServerSession } = require("next-auth");
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

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

        const session = (await getServerSession(getAuthOptions())) as any;
        const ret = await tx.salesReturn.create({
            data: {
                returnNumber,
                deliveryId: data.deliveryId,
                notes: data.notes,
                createdById: session?.user?.id,
                items: {
                    create: data.items.map((i: any) => ({
                        productId: i.productId,
                        deliveryItemId: i.deliveryItemId,
                        quantity: i.quantity,
                        reason: i.reason
                    }))
                }
            }
        });

        const delivery = await tx.salesDelivery.findUnique({
            where: { id: data.deliveryId },
            include: { items: true }
        });

        if (delivery) {
            for (const item of data.items) {
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

                // ─── FASE 3b: Restore Lot remainingQty on Sales Return ──────
                // Find the original allocations for this item from the SJ
                const deliveryItem = delivery.items.find((di: any) => di.productId === item.productId);
                if (deliveryItem) {
                    const allocations = await tx.lotAllocation.findMany({
                        where: { sdItemId: deliveryItem.id },
                        orderBy: { createdAt: 'desc' } // LIFO restore
                    });

                    let returnRemaining = item.quantity;
                    for (const alloc of allocations) {
                        if (returnRemaining <= 0) break;
                        const restoreQty = Math.min(returnRemaining, alloc.qty);
                        await tx.productLot.update({
                            where: { id: alloc.lotId },
                            data: { remainingQty: { increment: restoreQty } }
                        });
                        returnRemaining -= restoreQty;
                    }
                }
                // ────────────────────────────────────────────────────────────
            }
        }

        revalidatePath("/sales");
        revalidatePath("/finance");
        revalidatePath("/warehouse");
        return ret;
    });
}

export async function verifySalesReturnAction(id: string) {
    const { getAuthOptions } = require("@/lib/auth");
    const { getServerSession } = require("next-auth");
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    const session = (await getServerSession(getAuthOptions())) as any;
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
        const taxRate = Number(ret.delivery.taxRate || 0);

        ret.items.forEach((retItem: any) => {
            const deliveryItem = ret.delivery.items.find((i: any) => i.productId === retItem.productId);
            if (deliveryItem) {
                const itemBase = (retItem.quantity * Number(deliveryItem.salesPrice));
                const itemTax = Math.round(itemBase * (taxRate / 100));
                totalValue += (itemBase + itemTax);
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

        const arAccount = await tx.financeAccount.findUnique({ where: { code: '105' } });
        const salesAccount = await tx.financeAccount.findUnique({ where: { code: '401' } });

        if (arAccount && salesAccount) {
            await tx.journalEntry.create({ data: { description: `Retur Penjualan (Potongan Piutang): ${ret.returnNumber}`, amount: totalValue as any, type: "CREDIT", accountId: arAccount.id, date: new Date(), createdById: session?.user?.id } });
            await tx.journalEntry.create({ data: { description: `Retur Penjualan (Potongan Pendapatan): ${ret.returnNumber}`, amount: totalValue as any, type: "DEBIT", accountId: salesAccount.id, date: new Date(), createdById: session?.user?.id } });
        }

        revalidatePath("/finance");
        revalidatePath("/");
        return { success: true };
    });
}

export async function deleteSalesReturnAction(id: string) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    return await prisma.$transaction(async (tx: any) => {
        const ret = await tx.salesReturn.findUnique({
            where: { id },
            include: { items: { include: { deliveryItem: true } }, delivery: true }
        });
        if (!ret) throw new Error("Return not found");

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

            // ─── FASE 3b: Re-consume Lot on Delete Return ────────────────
            // Because we are deleting the return, the items are effectively "sold" again.
            const deliveryItem = ret.delivery.items.find((di: any) => di.productId === item.productId);
            if (deliveryItem) {
                const allocations = await tx.lotAllocation.findMany({
                    where: { sdItemId: deliveryItem.id },
                    orderBy: { createdAt: 'asc' } // FIFO consume
                });
                let reConsumeRemaining = item.quantity;
                for (const alloc of allocations) {
                    if (reConsumeRemaining <= 0) break;
                    // We consume from the lots that were originally allocated
                    const consume = Math.min(reConsumeRemaining, alloc.qty);
                    await tx.productLot.update({
                        where: { id: alloc.lotId },
                        data: { remainingQty: { decrement: consume } }
                    });
                    reConsumeRemaining -= consume;
                }
            }
            // ────────────────────────────────────────────────────────────
        }

        await tx.salesReturnItem.deleteMany({ where: { salesReturnId: id } });
        await tx.salesReturn.delete({ where: { id } });

        revalidatePath("/sales");
        revalidatePath("/finance");
        revalidatePath("/warehouse");
    });
}

export async function updateSalesReturnAction(id: string, data: any) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    return await prisma.$transaction(async (tx: any) => {
        const ret = await tx.salesReturn.findUnique({
            where: { id },
            include: { items: { include: { deliveryItem: true } }, delivery: true }
        });
        if (!ret) throw new Error("Return not found");
        if (ret.status === "VERIFIED_BY_FINANCE") throw new Error("Cannot edit verified return");

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

        await tx.salesReturnItem.deleteMany({ where: { salesReturnId: id } });
        await tx.stockMovement.deleteMany({ where: { reference: ret.returnNumber } });

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

export async function createManualSalesAction(data: any) {
    const { getAuthOptions } = require("@/lib/auth");
    const { getServerSession } = require("next-auth");
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    const session = (await getServerSession(getAuthOptions())) as any;
    if (!session) throw new Error("Unauthorized");

    const result = await prisma.$transaction(async (tx: any) => {
        const delivery = await tx.salesDelivery.create({
            data: {
                deliveryNumber: data.deliveryNumber,
                buyerName: data.buyerName,
                recipient: data.recipient,
                warehouseId: data.warehouseId,
                salesPerson: data.salesPerson,
                vehicleNumber: data.vehicleNumber,
                createdById: session.user.id,
                items: {
                    create: data.items.map((item: any) => ({
                        productId: item.productId,
                        quantity: item.quantity
                    }))
                }
            }
        });

        for (const item of data.items) {
            await tx.stock.updateMany({
                where: {
                    productId: item.productId,
                    warehouseId: data.warehouseId,
                    vendorName: "UMUM"
                },
                data: {
                    quantity: { decrement: item.quantity }
                }
            });

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

    const { serializeDecimal } = require("@/lib/utils");
    revalidatePath("/sales");
    revalidatePath("/warehouse");
    return serializeDecimal(result);
}

export async function voidSalesDeliveryAction(id: string, reason: string) {
    try {
        const { getAuthOptions } = require("@/lib/auth");
        const { getServerSession } = require("next-auth");
        const { voidSalesDeliveryService } = require("@/lib/services/sales-service");

        const session = (await getServerSession(getAuthOptions())) as any;
        if (!session?.user?.id) throw new Error("Unauthorized");

        return await voidSalesDeliveryService(id, reason);
    } catch (err: any) {
        console.error("[voidSalesDeliveryAction] CRITICAL ERROR:", err);
        return { error: err.message || "An unexpected error occurred while voiding the delivery." };
    }
}

export async function createSalesOrderAction(data: any) {
    try {
        const { getAuthOptions } = require("@/lib/auth");
        const { getServerSession } = require("next-auth");
        const { createSalesOrderService } = require("@/lib/services/sales-service");

        const session = (await getServerSession(getAuthOptions())) as any;
        if (!session?.user?.id) throw new Error("Unauthorized");

        return await createSalesOrderService(data, session.user.id);
    } catch (err: any) {
        console.error("[createSalesOrderAction] ERROR:", err);
        return { error: err.message || "Failed to create sales order." };
    }
}

export async function updateSalesOrderAction(id: string, data: any) {
    try {
        const { getAuthOptions } = require("@/lib/auth");
        const { getServerSession } = require("next-auth");
        const { updateSalesOrderService } = require("@/lib/services/sales-service");

        const session = (await getServerSession(getAuthOptions())) as any;
        if (!session?.user?.id) throw new Error("Unauthorized");

        return await updateSalesOrderService(id, data);
    } catch (err: any) {
        console.error("[updateSalesOrderAction] ERROR:", err);
        return { error: err.message || "Failed to update sales order." };
    }
}

export async function deleteSalesOrderAction(id: string) {
    try {
        const { getAuthOptions } = require("@/lib/auth");
        const { getServerSession } = require("next-auth");
        const { deleteSalesOrderService } = require("@/lib/services/sales-service");

        const session = (await getServerSession(getAuthOptions())) as any;
        if (!session?.user?.id) throw new Error("Unauthorized");

        return await deleteSalesOrderService(id);
    } catch (err: any) {
        console.error("[deleteSalesOrderAction] ERROR:", err);
        return { error: err.message || "Failed to delete sales order." };
    }
}
