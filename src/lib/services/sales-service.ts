
import { revalidatePath } from "next/cache";

/**
 * SALES SERVICES
 * Strictly server-side logic for sales operations.
 */

export async function createSalesDeliveryService(data: any, userId: string) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    const txDate = data.createdAt || new Date();
    const day = String(txDate.getDate()).padStart(2, '0');
    const month = String(txDate.getMonth() + 1).padStart(2, '0');
    const year = txDate.getFullYear();
    const dateStr = `${day}${month}${year}`;

    return await prisma.$transaction(async (tx: any) => {
        const isPKP = data.isPKP === true || (Number(data.taxRate) || 0) > 0;

        const prefix = isPKP ? `KB-TRN-${dateStr}-` : `KB-TRD-${dateStr}-`;

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

        const delivery = await tx.salesDelivery.create({
            data: {
                deliveryNumber: deliveryNumber,
                orderId: data.orderId || null,
                recipient: data.recipient,
                buyerName: data.buyerName,
                vehicleNumber: data.vehicleNumber,
                poNumber: data.poNumber,
                warehouseId: data.warehouseId,
                salesPerson: data.salesPerson,
                date: txDate,
                createdAt: txDate,
                createdById: userId,
                items: {
                    create: data.items.map((item: any) => ({
                        productId: item.productId,
                        orderItemId: item.orderItemId || null,
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
        data.items.forEach((i: any) => {
            const lineGross = i.quantity * i.salesPrice;
            const lineDiscount = Number(i.discount || 0);
            grossAmount += lineGross;
            totalItemDiscounts += lineDiscount;
        });

        const subtotal = Math.round(grossAmount - totalItemDiscounts);
        const totalDiscountNominal = Math.round(Number(data.totalDiscount) || 0);
        const taxRatePercent = Number(data.taxRate) || 0;
        const dpp = subtotal - totalDiscountNominal;
        const dppNilaiLain = taxRatePercent > 0 ? Math.round(dpp * 0.916666666666667) : 0;
        const taxAmount = taxRatePercent > 0 ? Math.round(dppNilaiLain * 0.12) : 0;
        const grandTotal = Math.round(dpp + taxAmount);

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

            // If linked to a PO, update shipped quantity
            if (item.orderItemId) {
                await tx.salesOrderItem.update({
                    where: { id: item.orderItemId },
                    data: { shippedQuantity: { increment: item.quantity } }
                });
            }
        }
        
        // If all items in PO are shipped, we could mark PO as CLOSED if we want

        revalidatePath("/sales");
        revalidatePath("/warehouse");
        revalidatePath("/finance");
        revalidatePath("/");

        return { success: true, deliveryNumber };
    }, { timeout: 30000 });
}

export async function updateSalesDeliveryService(id: string, data: any) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    return await prisma.$transaction(async (tx: any) => {
        const oldDelivery = await tx.salesDelivery.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!oldDelivery) throw new Error("Delivery not found");

        for (const item of oldDelivery.items) {
            await tx.stock.upsert({
                where: {
                    productId_warehouseId_vendorName: {
                        productId: item.productId,
                        warehouseId: oldDelivery.warehouseId,
                        vendorName: item.vendorName
                    }
                },
                create: {
                    productId: item.productId,
                    warehouseId: oldDelivery.warehouseId,
                    vendorName: item.vendorName,
                    quantity: item.quantity
                },
                update: { quantity: { increment: item.quantity } }
            });
        }

        await tx.salesDeliveryItem.deleteMany({ where: { deliveryId: id } });

        const txDate = data.createdAt || new Date();

        await tx.salesDelivery.update({
            where: { id },
            data: {
                recipient: data.recipient,
                buyerName: data.buyerName,
                vehicleNumber: data.vehicleNumber,
                poNumber: data.poNumber,
                warehouseId: data.warehouseId,
                salesPerson: data.salesPerson,
                date: txDate,
                createdAt: txDate
            }
        });

        const currentDeliveryNumber = oldDelivery.deliveryNumber;

        for (const item of data.items) {
            const vendorName = item.vendorName || "UMUM";

            // VALIDASI STOK: Cek apakah stok mencukupi sebelum mengurangi
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
                throw new Error(`Stok tidak mencukupi untuk produk ${product?.name || item.productId} dari vendor ${vendorName}. Tersedia: ${currentStock?.quantity || 0}, Dibutuhkan: ${item.quantity}`);
            }

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
                    reference: currentDeliveryNumber
                }
            });
        }

        let grossAmount = 0;
        let totalItemDiscounts = 0;
        data.items.forEach((i: any) => {
            const lineGross = i.quantity * i.salesPrice;
            const lineDiscount = Number(i.discount || 0);
            grossAmount += lineGross;
            totalItemDiscounts += lineDiscount;
        });

        const subtotal = Math.round(grossAmount - totalItemDiscounts);
        const totalDiscountNominal = Math.round(Number(data.totalDiscount) || 0);
        const taxRatePercent = Number(data.taxRate) || 0;
        const dpp = subtotal - totalDiscountNominal;
        const dppNilaiLain = taxRatePercent > 0 ? Math.round(dpp * 0.916666666666667) : 0;
        const taxAmount = taxRatePercent > 0 ? Math.round(dppNilaiLain * 0.12) : 0;
        const grandTotal = Math.round(dpp + taxAmount);

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

        return { success: true, deliveryNumber: currentDeliveryNumber };
    }, { timeout: 30000 });
}

export async function deleteSalesDeliveryService(id: string) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    return await prisma.$transaction(async (tx: any) => {
        const delivery = await tx.salesDelivery.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!delivery) throw new Error("Delivery not found");

        for (const item of delivery.items) {
            await tx.stock.upsert({
                where: {
                    productId_warehouseId_vendorName: {
                        productId: item.productId,
                        warehouseId: delivery.warehouseId,
                        vendorName: item.vendorName
                    }
                },
                create: {
                    productId: item.productId,
                    warehouseId: delivery.warehouseId,
                    vendorName: item.vendorName,
                    quantity: item.quantity
                },
                update: { quantity: { increment: item.quantity } }
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
    }, { timeout: 30000 });
}

export async function voidSalesDeliveryService(id: string, reason: string) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    return await prisma.$transaction(async (tx: any) => {
        const delivery = await tx.salesDelivery.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!delivery) throw new Error("Delivery not found");
        if (delivery.isVoid) throw new Error("Delivery is already voided");

        for (const item of delivery.items) {
            // Restore Stock
            await tx.stock.upsert({
                where: {
                    productId_warehouseId_vendorName: {
                        productId: item.productId,
                        warehouseId: delivery.warehouseId,
                        vendorName: item.vendorName
                    }
                },
                create: {
                    productId: item.productId,
                    warehouseId: delivery.warehouseId,
                    vendorName: item.vendorName,
                    quantity: item.quantity
                },
                update: { quantity: { increment: item.quantity } }
            });

            // Create Reversing Movement
            await tx.stockMovement.create({
                data: {
                    productId: item.productId,
                    warehouseId: delivery.warehouseId,
                    vendorName: item.vendorName,
                    quantity: item.quantity,
                    type: "SALE_VOID",
                    reference: delivery.deliveryNumber
                }
            });
        }

        // Mark as Voided
        await tx.salesDelivery.update({
            where: { id },
            data: {
                isVoid: true,
                voidReason: reason
            }
        });

        revalidatePath("/sales");
        revalidatePath("/warehouse");
        revalidatePath("/finance");
        revalidatePath("/tracking");
        revalidatePath("/");

        return { success: true };
    }, { timeout: 30000 });
}
