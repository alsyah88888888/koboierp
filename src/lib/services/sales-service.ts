
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

        const delivery = await tx.salesDelivery.create({
            data: {
                deliveryNumber: deliveryNumber,
                recipient: data.recipient,
                buyerName: data.buyerName,
                poNumber: data.poNumber,
                warehouseId: data.warehouseId,
                salesPerson: data.salesPerson,
                createdAt: txDate,
                createdById: userId,
                items: {
                    create: data.items.map((item: any) => ({
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
        data.items.forEach((i: any) => {
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
        data.items.forEach((i: any) => {
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
