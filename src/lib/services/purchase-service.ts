
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
            where: { number: { startsWith: prefix } },
            orderBy: { number: 'desc' }
        });

        let nextNum = 1;
        if (latest) {
            const parts = latest.number.split('-');
            const lastSeq = parseInt(parts[parts.length - 1]);
            if (!isNaN(lastSeq)) nextNum = lastSeq + 1;
        }
        const number = `${prefix}${String(nextNum).padStart(3, '0')}`;

        const req = await tx.purchaseRequest.create({
            data: {
                number,
                requestedById: userId,
                notes: data.notes,
                category: data.category,
                items: {
                    create: data.items.map((i: any) => ({
                        itemName: i.itemName,
                        quantity: i.quantity,
                        estimatedPrice: i.estimatedPrice
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

export async function updateGoodsReceiptService(id: string, data: any, userId: string) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    return await prisma.$transaction(async (tx: any) => {
        const oldReceipt = await tx.goodsReceipt.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!oldReceipt) throw new Error("Receipt not found");

        // 1. Revert Old Stock
        for (const item of oldReceipt.items) {
            const vendorName = oldReceipt.receivedFrom || "UMUM";
            await tx.stock.update({
                where: {
                    productId_warehouseId_vendorName: {
                        productId: item.productId,
                        warehouseId: oldReceipt.warehouseId,
                        vendorName: vendorName
                    }
                },
                data: { quantity: { decrement: item.quantity } }
            });
        }

        // 2. Update Header & Items
        await tx.goodsReceiptItem.deleteMany({ where: { receiptId: id } });

        const txDate = data.date || new Date();
        await tx.goodsReceipt.update({
            where: { id },
            data: {
                receivedFrom: data.receivedFrom,
                purchaseOrderId: data.purchaseOrderId,
                warehouseId: data.warehouseId,
                salesPerson: data.salesPerson,
                notes: data.notes,
                date: txDate,
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

        // 3. Recalculate Totals (Reuse logic from create)
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
            where: { id },
            data: {
                subtotal: subtotal,
                totalDiscount: totalDiscountNominal,
                taxRate: taxRatePercent,
                taxAmount: taxAmount,
                grandTotal: grandTotal
            }
        });

        // 4. Apply New Stock
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
                    type: "PURCHASE_UPDATE",
                    reference: oldReceipt.receiptNumber
                }
            });
        }

        revalidatePath("/purchase");
        revalidatePath("/warehouse");
        revalidatePath("/finance");
        revalidatePath("/");

        return { success: true };
    });
}

export async function createPurchaseReturnService(data: any, userId: string) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    return await prisma.$transaction(async (tx: any) => {
        const today = new Date();
        const dateStr = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
        const prefix = `RET-PUR-${dateStr}-`;
        
        const latest = await tx.purchaseReturn.findFirst({
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

        const receipt = await tx.goodsReceipt.findUnique({
            where: { id: data.receiptId },
            include: { items: true }
        });

        if (!receipt) throw new Error("Referensi LPB tidak ditemukan");

        const ret = await tx.purchaseReturn.create({
            data: {
                returnNumber,
                receiptId: data.receiptId,
                notes: data.notes,
                createdById: userId,
                items: {
                    create: data.items.map((i: any) => ({
                        productId: i.productId,
                        quantity: i.quantity,
                        reason: i.reason
                    }))
                }
            }
        });

        for (const item of data.items) {
            const vendorName = receipt.receivedFrom || "UMUM";
            await tx.stock.update({
                where: {
                    productId_warehouseId_vendorName: {
                        productId: item.productId,
                        warehouseId: receipt.warehouseId,
                        vendorName: vendorName
                    }
                },
                data: { quantity: { decrement: item.quantity } }
            });

            await tx.stockMovement.create({
                data: {
                    productId: item.productId,
                    warehouseId: receipt.warehouseId,
                    vendorName: vendorName,
                    quantity: -item.quantity,
                    type: "PURCHASE_RETURN",
                    reference: returnNumber
                }
            });
        }

        revalidatePath("/purchase");
        revalidatePath("/warehouse");
        revalidatePath("/finance");
        revalidatePath("/");
        
        return ret;
    });
}

export async function updatePurchaseRequestStatusService(id: string, status: string, userId: string) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    const data: any = { status };
    if (status === "APPROVED_BY_ADMIN") {
        data.approvedById = userId;
        data.approvedAt = new Date();
    } else if (status === "VERIFIED_BY_FINANCE") {
        data.verifiedById = userId;
        data.verifiedAt = new Date();
    } else if (status === "REJECTED") {
        // Just status
    }

    const res = await prisma.purchaseRequest.update({
        where: { id },
        data
    });

    revalidatePath("/purchase");
    return { success: true, request: res };
}

export async function deletePurchaseReturnService(id: string) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    return await prisma.$transaction(async (tx: any) => {
        const ret = await tx.purchaseReturn.findUnique({
            where: { id },
            include: { 
                items: true,
                receipt: true
            }
        });

        if (!ret) throw new Error("Return record not found");

        for (const item of ret.items) {
            const vendorName = ret.receipt.receivedFrom || "UMUM";
            await tx.stock.update({
                where: {
                    productId_warehouseId_vendorName: {
                        productId: item.productId,
                        warehouseId: ret.receipt.warehouseId,
                        vendorName: vendorName
                    }
                },
                data: { quantity: { increment: item.quantity } }
            });

            await tx.stockMovement.create({
                data: {
                    productId: item.productId,
                    warehouseId: ret.receipt.warehouseId,
                    vendorName: vendorName,
                    quantity: item.quantity,
                    type: "PURCHASE_RETURN_DELETE",
                    reference: ret.returnNumber
                }
            });
        }

        await tx.purchaseReturnItem.deleteMany({ where: { purchaseReturnId: id } });
        await tx.purchaseReturn.delete({ where: { id } });

        revalidatePath("/purchase");
        revalidatePath("/warehouse");
        revalidatePath("/");

        return { success: true };
    });
}

export async function getPurchaseRequestSummaryService() {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    const [pending, approved, verified, items] = await Promise.all([
        prisma.purchaseRequest.count({ where: { status: "PENDING" } }),
        prisma.purchaseRequest.count({ where: { status: "APPROVED_BY_ADMIN" } }),
        prisma.purchaseRequest.count({ where: { status: "VERIFIED_BY_FINANCE" } }),
        prisma.purchaseRequestItem.findMany({
            where: { purchaseRequest: { status: { not: "REJECTED" } } },
            select: { quantity: true, estimatedPrice: true }
        })
    ]);

    const totalEstimation = items.reduce((acc: number, item: any) => {
        return acc + (item.quantity * Number(item.estimatedPrice));
    }, 0);

    return {
        pending,
        approved,
        verified,
        totalEstimation
    };
}

