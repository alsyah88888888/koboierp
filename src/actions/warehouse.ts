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
