
import { revalidatePath } from "next/cache";

/**
 * PURCHASE SERVICES
 * Strictly server-side logic for purchase operations.
 */

export async function createPurchaseRequestService(data: any, userId: string) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    return await prisma.$transaction(async (tx: any) => {
        const today = new Date();
        const dateStr = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
        const prefix = `KB-PR-${dateStr}-`;
        const latest = await tx.purchaseRequest.findFirst({
            where: { requestNumber: { startsWith: prefix } },
            orderBy: { requestNumber: 'desc' }
        });

        let nextNum = 1;
        if (latest) {
            const parts = latest.requestNumber.split('-');
            const lastSeq = parseInt(parts[parts.length - 1]);
            if (!isNaN(lastSeq)) nextNum = lastSeq + 1;
        }
        const requestNumber = `${prefix}${String(nextNum).padStart(3, '0')}`;

        const req = await tx.purchaseRequest.create({
            data: {
                requestNumber,
                requestedById: userId,
                notes: data.notes,
                category: data.category,
                items: {
                    create: data.items.map((i: any) => ({
                        productId: i.productId,
                        quantity: i.quantity,
                        uom: i.uom,
                        vendorName: i.vendorName || "UMUM"
                    }))
                }
            }
        });

        revalidatePath("/purchase");
        revalidatePath("/");
        return req;
    });
}

export async function createGoodsReceiptService(data: any, userId: string) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    const txDate = data.date || new Date();
    const day = String(txDate.getDate()).padStart(2, '0');
    const month = String(txDate.getMonth() + 1).padStart(2, '0');
    const year = txDate.getFullYear();
    const dateStr = `${day}${month}${year}`;

    return await prisma.$transaction(async (tx: any) => {
        const hasTaxOrDisc = (Number(data.taxRate) || 0) > 0 || (Number(data.totalDiscount) || 0) > 0 || data.items.some((i: any) => (Number(i.discount) || 0) > 0);
        const prefix = hasTaxOrDisc ? `KB-LPBD-${dateStr}-` : `KB-LPB-${dateStr}-`;

        const latest = await tx.goodsReceipt.findFirst({
            where: { receiptNumber: { startsWith: prefix } },
            orderBy: { receiptNumber: 'desc' }
        });

        let nextNum = 1;
        if (latest) {
            const parts = latest.receiptNumber.split('-');
            const lastSeq = parseInt(parts[parts.length - 1]);
            if (!isNaN(lastSeq)) nextNum = lastSeq + 1;
        }
        const receiptNumber = `${prefix}${String(nextNum).padStart(3, '0')}`;

        const receipt = await tx.goodsReceipt.create({
            data: {
                receiptNumber,
                receivedFrom: data.receivedFrom,
                purchaseOrderId: data.purchaseOrderId,
                warehouseId: data.warehouseId,
                salesPerson: data.salesPerson,
                notes: data.notes,
                date: txDate,
                createdById: userId,
                items: {
                    create: data.items.map((item: any) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        purchasePrice: item.purchasePrice as any,
                        discount: item.discount as any,
                        uom: item.uom
                    }))
                }
            }
        });

        let grossAmount = 0;
        let totalItemDiscounts = 0;
        data.items.forEach((i: any) => {
            const lineGross = i.quantity * i.purchasePrice;
            const lineDiscount = Number(i.discount || 0);
            grossAmount += lineGross;
            totalItemDiscounts += lineDiscount;
        });

        const subtotal = Math.round(grossAmount - totalItemDiscounts);
        const totalDiscountNominal = Math.round(Number(data.totalDiscount) || 0);
        const taxRatePercent = Number(data.taxRate) || 0;
        const taxAmount = Math.round((subtotal - totalDiscountNominal) * (taxRatePercent / 100));
        const grandTotal = Math.round(subtotal - totalDiscountNominal + taxAmount);

        await tx.goodsReceipt.update({
            where: { id: receipt.id },
            data: {
                subtotal: subtotal,
                totalDiscount: totalDiscountNominal,
                taxRate: taxRatePercent,
                taxAmount: taxAmount,
                grandTotal: grandTotal,
                paymentStatus: "PENDING"
            }
        });

        for (const item of data.items) {
            const vendorName = data.receivedFrom || "UMUM";
            await tx.stock.upsert({
                where: {
                    productId_warehouseId_vendorName: {
                        productId: item.productId,
                        warehouseId: data.warehouseId,
                        vendorName: vendorName
                    }
                },
                update: { quantity: { increment: item.quantity } },
                create: {
                    productId: item.productId,
                    warehouseId: data.warehouseId,
                    vendorName: vendorName,
                    quantity: item.quantity
                }
            });

            await tx.stockMovement.create({
                data: {
                    productId: item.productId,
                    warehouseId: data.warehouseId,
                    vendorName: vendorName,
                    quantity: item.quantity,
                    type: "PURCHASE",
                    reference: receiptNumber
                }
            });
        }

        revalidatePath("/purchase");
        revalidatePath("/warehouse");
        revalidatePath("/finance");
        revalidatePath("/");

        return { success: true, receiptNumber };
    });
}
