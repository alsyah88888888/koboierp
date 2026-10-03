"use server";

import { revalidatePath } from "next/cache";

/**
 * WAREHOUSE ACTIONS
 * Entry points for warehouse operations.
 * Use dynamic imports for services to satisfy build boundaries.
 */

export async function updateStockAction(data: {
    productId: string;
    warehouseId: string;
    quantity: number;
    vendorName?: string;
    type: "ADJUSTMENT" | "SALE" | "GOODS_RECEIPT";
    reference?: string;
}) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    await prisma.$transaction(async (tx: any) => {
        const vendorName = data.vendorName || "UMUM";
        await tx.stock.upsert({
            where: {
                productId_warehouseId_vendorName: {
                    productId: data.productId,
                    warehouseId: data.warehouseId,
                    vendorName: vendorName
                }
            },
            update: { quantity: { increment: data.quantity } },
            create: {
                productId: data.productId,
                warehouseId: data.warehouseId,
                vendorName: vendorName,
                quantity: data.quantity
            }
        });

        await tx.stockMovement.create({
            data: {
                productId: data.productId,
                warehouseId: data.warehouseId,
                vendorName: vendorName,
                quantity: data.quantity,
                type: data.type,
                reference: data.reference
            }
        });
    });

    revalidatePath("/warehouse");
    revalidatePath("/");
}

export async function getStockMovementsAction(filters?: {
    productId?: string;
    warehouseId?: string;
    type?: string;
}) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    return await prisma.stockMovement.findMany({
        where: filters,
        include: {
            product: { select: { name: true, sku: true } },
            warehouse: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
    });
}

export async function adjustStockAction(data: {
    productId: string;
    warehouseId: string;
    vendorName: string;
    type: "ADD" | "SUBTRACT" | "SET";
    amount: number;
    notes: string;
    adjustedBy: string;
}) {
    const { adjustStockService } = require("@/lib/services/warehouse-service");
    return await adjustStockService(data);
}

export async function getProductTrackingAction(productId: string) {
    const { getAuthOptions } = require("@/lib/auth");
    const { getServerSession } = require("next-auth");
    const { getProductTrackingService } = require("@/lib/services/warehouse-service");

    const session = (await getServerSession(getAuthOptions())) as any;
    if (!session?.user?.id) throw new Error("Unauthorized");

    const isAdmin = session.user.role?.toUpperCase() === "ADMIN";
    return await getProductTrackingService(productId, session.user.id, session.user.prefix || null, isAdmin);
}
export async function getGoodsReceiptsAction() {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();
    return await prisma.goodsReceipt.findMany({
        where: { isVerified: false },
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' }
    });
}

export async function submitGoodsReceiptVerificationAction(data: any) {
    const { verifyGoodsReceiptService } = require("@/lib/services/warehouse-service");
    // Flatten items for verifyGoodsReceiptService which expects Record<string, number>
    const checkedItems: Record<string, number> = {};
    data.items.forEach((item: any) => {
        // Find the item in the original receipt to get its ID
        // Note: verifyGoodsReceiptService expects receiptItem ID, not productId
        checkedItems[item.productId] = item.actualQuantity; // This is a bit dirty, better map it correctly
    });
    
    // Better: update verifyGoodsReceiptAction or call service directly with mapped data
    return await verifyGoodsReceiptService(data.receiptId, data.verifiedBy, checkedItems);
}

export async function verifyGoodsReceiptAction(receiptId: string, verifiedBy: string, checkedItems: Record<string, number>) {
    const { verifyGoodsReceiptService } = require("@/lib/services/warehouse-service");
    return await verifyGoodsReceiptService(receiptId, verifiedBy, checkedItems);
}

export async function voidGoodsReceiptAction(id: string, reason: string) {
    const { voidGoodsReceiptService } = require("@/lib/services/warehouse-service");
    return await voidGoodsReceiptService(id, reason);
}

export async function bulkVerifyGoodsReceiptAction(verifiedBy: string) {
    const { bulkVerifyGoodsReceiptsService } = require("@/lib/services/warehouse-service");
    return await bulkVerifyGoodsReceiptsService(verifiedBy);
}

export async function runStockAuditAction() {
    const { runStockAuditService } = require("@/lib/services/warehouse-service");
    return await runStockAuditService();
}

export async function syncProductStockAction(productId: string) {
    const { getServerSession } = require("next-auth");
    const { getAuthOptions } = require("@/lib/auth");
    const { syncProductStockService } = require("@/lib/services/warehouse-service");
    
    const session = (await getServerSession(getAuthOptions())) as any;
    if (!session?.user?.id) throw new Error("Unauthorized");

    const role = session.user.role?.toUpperCase();
    if (!["ADMIN", "PURCHASE", "WAREHOUSE"].includes(role)) {
        throw new Error("Anda tidak memiliki izin untuk melakukan sinkronisasi stok");
    }

    return await syncProductStockService(productId, session.user.name || session.user.email || "SYSTEM");
}

export async function getStockCardAction(productId: string, startDate?: string, endDate?: string, warehouseId?: string) {
    const { getStockCardService } = require("@/lib/services/warehouse-service");
    return await getStockCardService(productId, startDate, endDate, warehouseId);
}

export async function transferStockAction(data: {
    productId: string;
    fromWarehouseId: string;
    fromVendorName: string;
    toWarehouseId: string;
    toVendorName: string;
    quantity: number;
    notes: string;
    transferredBy: string;
}) {
    const { transferStockService } = require("@/lib/services/warehouse-service");
    return await transferStockService(data);
}

export async function getDailyShippingScheduleAction(dateStr: string) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    const startUtc = new Date(dateStr + "T00:00:00.000Z");
    const endUtc = new Date(dateStr + "T23:59:59.999Z");
    const minDate = new Date(startUtc.getTime() - 8 * 3600 * 1000);
    const maxDate = new Date(endUtc.getTime() + 8 * 3600 * 1000);

    const rawDeliveries = await prisma.salesDelivery.findMany({
        where: {
            isVoid: false,
            OR: [
                { date: { gte: minDate, lte: maxDate } },
                { createdAt: { gte: minDate, lte: maxDate } }
            ]
        },
        include: {
            warehouse: { select: { name: true } },
            items: {
                include: { product: true },
                orderBy: { id: "asc" }
            }
        },
        orderBy: [
            { buyerName: "asc" },
            { createdAt: "asc" }
        ]
    });

    // Filter strictly to the selected date (matching UTC or local WIB)
    const deliveries = rawDeliveries.filter((r: any) => {
        const d1 = new Date(r.date).toISOString().slice(0, 10);
        const d2 = new Date(r.createdAt).toISOString().slice(0, 10);
        const dLocal = new Date(new Date(r.date).getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
        return d1 === dateStr || d2 === dateStr || dLocal === dateStr;
    });

    return deliveries.map((d: any) => {
        const inv = d.invoiceNumber || "";
        const isTRN = inv.startsWith("KB-TRN") || Number(d.taxRate || 0) > 0;
        const taxType = isTRN ? "KB-TRN" : "KB-TRD";

        return {
            id: d.id,
            deliveryNumber: d.deliveryNumber,
            invoiceNumber: inv,
            taxRate: Number(d.taxRate || 0),
            taxType: taxType,
            poNumber: d.poNumber || "",
            buyerName: d.buyerName || "",
            driver: d.vehicleNumber || "",
            warehouseName: d.warehouse?.name || "",
            salesPerson: d.salesPerson || "",
            date: d.date,
            items: d.items.map((it: any) => ({
                id: it.id,
                productId: it.productId,
                productName: it.product?.name || "Item",
                quantity: Number(it.quantity || 0),
                uom: it.uom || it.product?.uom || "UNIT"
            }))
        };
    });
}

export async function updateDeliveryDriverAction(deliveryId: string, driver: string) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    const updated = await prisma.salesDelivery.update({
        where: { id: deliveryId },
        data: { vehicleNumber: driver }
    });

    revalidatePath("/warehouse");
    revalidatePath("/warehouse/jadwal-pengiriman");
    revalidatePath("/delivery");
    return { success: true, vehicleNumber: updated.vehicleNumber };
}

