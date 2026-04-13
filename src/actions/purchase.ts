"use server";

import { revalidatePath } from "next/cache";

/**
 * PURCHASE ACTIONS
 * Entry points for purchase operations.
 * Use dynamic imports for services to satisfy build boundaries.
 */

export async function createPurchaseRequestAction(data: any) {
    try {
        const { getAuthOptions } = require("@/lib/auth");
        const { getServerSession } = require("next-auth");
        const { createPurchaseRequestService } = require("@/lib/services/purchase-service");

        const session = (await getServerSession(getAuthOptions())) as any;
        if (!session?.user?.id) throw new Error("Unauthorized");

        return await createPurchaseRequestService(data, session.user.id);
    } catch (err: any) {
        console.error("[createPurchaseRequestAction] ERROR:", err);
        return { error: err.message || "An unexpected error occurred while creating the purchase request." };
    }
}

export async function createGoodsReceiptAction(data: any) {
    try {
        const { getAuthOptions } = require("@/lib/auth");
        const { getServerSession } = require("next-auth");
        const { createGoodsReceiptService } = require("@/lib/services/purchase-service");

        const session = (await getServerSession(getAuthOptions())) as any;
        if (!session?.user?.id) throw new Error("Unauthorized");

        return await createGoodsReceiptService(data, session.user.id);
    } catch (err: any) {
        console.error("[createGoodsReceiptAction] ERROR:", err);
        return { error: err.message || "An unexpected error occurred while creating the goods receipt." };
    }
}

export async function deleteGoodsReceiptAction(id: string) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    return await prisma.$transaction(async (tx: any) => {
        const receipt = await tx.goodsReceipt.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!receipt) throw new Error("Receipt not found");

        for (const item of receipt.items) {
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
                    type: "PURCHASE_DELETE",
                    reference: receipt.receiptNumber
                }
            });
        }

        await tx.goodsReceiptItem.deleteMany({ where: { receiptId: id } });
        await tx.goodsReceipt.delete({ where: { id } });

        revalidatePath("/purchase");
        revalidatePath("/warehouse");
        revalidatePath("/finance");
        revalidatePath("/");

        return { success: true };
    });
}

export async function createPurchaseOrderAction(data: any) {
    try {
        const { getAuthOptions } = require("@/lib/auth");
        const { getServerSession } = require("next-auth");
        const { getPrisma } = require("@/lib/prisma");
        const prisma = getPrisma();

        return await prisma.$transaction(async (tx: any) => {
            const today = new Date();
            const dateStr = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
            const prefix = `KB-PO-${dateStr}-`;
            const latest = await tx.purchaseOrder.findFirst({
                where: { orderNumber: { startsWith: prefix } },
                orderBy: { orderNumber: 'desc' }
            });

            let nextNum = 1;
            if (latest) {
                const parts = latest.orderNumber.split('-');
                const lastSeq = parseInt(parts[parts.length - 1]);
                if (!isNaN(lastSeq)) nextNum = lastSeq + 1;
            }
            const orderNumber = `${prefix}${String(nextNum).padStart(3, '0')}`;

            const session = (await getServerSession(getAuthOptions())) as any;
            const po = await tx.purchaseOrder.create({
                data: {
                    orderNumber,
                    vendorId: data.vendorId,
                    notes: data.notes,
                    createdById: session?.user?.id,
                    items: {
                        create: data.items.map((i: any) => ({
                            productId: i.productId,
                            quantity: i.quantity,
                            uom: i.uom,
                            purchasePrice: i.purchasePrice as any
                        }))
                    }
                }
            });

            revalidatePath("/purchase");
            return po;
        });
    } catch (err: any) {
        console.error("[createPurchaseOrderAction] ERROR:", err);
        return { error: err.message || "An unexpected error occurred while creating the purchase order." };
    }
}

export async function deletePurchaseRequestAction(id: string) {
    try {
        const { getPrisma } = require("@/lib/prisma");
        const prisma = getPrisma();

        return await prisma.$transaction(async (tx: any) => {
            const pr = await tx.purchaseRequest.findUnique({
                where: { id }
            });

            if (!pr) throw new Error("Pengajuan tidak ditemukan");

            // If EXECUTED, cleanup financial records
            if (pr.status === "EXECUTED") {
                // Find associated transactions by searching for the PR number in description
                const transactions = await tx.financeTransaction.findMany({
                    where: {
                        description: { contains: pr.number }
                    }
                });

                for (const ftx of transactions) {
                    // Delete journal entries first
                    await tx.journalEntry.deleteMany({
                        where: { transactionId: ftx.id }
                    });
                    // Delete the transaction itself
                    await tx.financeTransaction.delete({
                        where: { id: ftx.id }
                    });
                }
            }

            // Standard cleanup
            await tx.purchaseRequestItem.deleteMany({ where: { purchaseRequestId: id } });
            await tx.purchaseRequest.delete({ where: { id } });

            revalidatePath("/purchase");
            revalidatePath("/purchase/request");
            revalidatePath("/operational");
            revalidatePath("/finance");
            revalidatePath("/");

            return { success: true };
        }, { timeout: 30000 });
    } catch (err: any) {
        console.error("[deletePurchaseRequestAction] ERROR:", err);
        return { error: err.message || "Gagal menghapus pengajuan" };
    }
}

export async function updateGoodsReceiptAction(id: string, data: any) {
    try {
        const { getAuthOptions } = require("@/lib/auth");
        const { getServerSession } = require("next-auth");
        const { updateGoodsReceiptService } = require("@/lib/services/purchase-service");

        const session = (await getServerSession(getAuthOptions())) as any;
        if (!session?.user?.id) throw new Error("Unauthorized");

        return await updateGoodsReceiptService(id, data, session.user.id);
    } catch (err: any) {
        console.error("[updateGoodsReceiptAction] ERROR:", err);
        return { error: err.message || "An unexpected error occurred while updating the goods receipt." };
    }
}

export async function createPurchaseReturnAction(data: any) {
    try {
        const { getAuthOptions } = require("@/lib/auth");
        const { getServerSession } = require("next-auth");
        const { createPurchaseReturnService } = require("@/lib/services/purchase-service");

        const session = (await getServerSession(getAuthOptions())) as any;
        if (!session?.user?.id) throw new Error("Unauthorized");

        return await createPurchaseReturnService(data, session.user.id);
    } catch (err: any) {
        console.error("[createPurchaseReturnAction] ERROR:", err);
        return { error: err.message || "An unexpected error occurred while creating the purchase return." };
    }
}

export async function deletePurchaseReturnAction(id: string) {
    const { deletePurchaseReturnService } = require("@/lib/services/purchase-service");
    return await deletePurchaseReturnService(id);
}

export async function updatePurchaseRequestStatusAction(id: string, status: string) {
    const { getAuthOptions } = require("@/lib/auth");
    const { getServerSession } = require("next-auth");
    const { updatePurchaseRequestStatusService } = require("@/lib/services/purchase-service");

    const session = (await getServerSession(getAuthOptions())) as any;
    if (!session?.user?.id) throw new Error("Unauthorized");

    return await updatePurchaseRequestStatusService(id, status, session.user.id);
}

export async function getPurchaseRequestSummaryAction() {
    const { getPurchaseRequestSummaryService } = require("@/lib/services/purchase-service");
    return await getPurchaseRequestSummaryService();
}

export async function getPurchaseRequestsAction() {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();
    return await prisma.purchaseRequest.findMany({
        include: { 
            requestedBy: true,
            items: true 
        },
        orderBy: { createdAt: 'desc' }
    });
}

export async function executePurchaseRequestAction(id: string, paymentData: any) {
    try {
        const { getAuthOptions } = require("@/lib/auth");
        const { getServerSession } = require("next-auth");
        const { executePurchaseRequestService } = require("@/lib/services/purchase-service");

        const session = (await getServerSession(getAuthOptions())) as any;
        if (!session?.user?.id) throw new Error("Unauthorized");

        return await executePurchaseRequestService(id, paymentData, session.user.id);
    } catch (err: any) {
        console.error("[executePurchaseRequestAction] ERROR:", err);
        return { error: err.message || "An unexpected error occurred while executing the request." };
    }
}


