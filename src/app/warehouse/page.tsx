import { getPrisma } from "@/lib/prisma";
import { WarehouseDashboard } from "./WarehouseDashboard";
import { serializeDecimal } from "@/lib/utils";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/lib/auth";

export default async function WarehousePage() {
    // Force dynamic rendering to skip build-time DB check
    await headers();
    
    const prisma = getPrisma();
    const session = await getServerSession(getAuthOptions()) as any;

    if (!session) {
        redirect("/api/auth/signin");
    }
    const products = await prisma.product.findMany({

        include: { stocks: true },
        orderBy: { sku: 'asc' }
    }).catch(() => []);

    const warehouses = await prisma.warehouse.findMany().catch(() => []);

    const unverifiedReceipts = await prisma.goodsReceipt.findMany({
        where: { isVerified: false, isVoid: false },
        include: { 
            items: { include: { product: true } },
            warehouse: true 
        },
        orderBy: { createdAt: 'desc' }
    }).catch(() => []);

    // Manual relation fetch for StockMovement to avoid TS errors and schema migration issues
    const rawMovements = await prisma.stockMovement.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
    }).catch(() => []);

    const productIds = Array.from(new Set(rawMovements.map((m: any) => m.productId)));
    const warehouseIds = Array.from(new Set(rawMovements.map((m: any) => m.warehouseId)));

    const [movementProducts, movementWarehouses] = await Promise.all([
        prisma.product.findMany({ where: { id: { in: productIds } } }),
        prisma.warehouse.findMany({ where: { id: { in: warehouseIds } } })
    ]);

    const movements = rawMovements.map((m: any) => ({
        ...m,
        product: movementProducts.find((p: any) => p.id === m.productId),
        warehouse: movementWarehouses.find((w: any) => w.id === m.warehouseId)
    }));

    return <WarehouseDashboard
        initialProducts={serializeDecimal(products)}
        warehouses={serializeDecimal(warehouses)}
        unverifiedReceipts={serializeDecimal(unverifiedReceipts)}
        movements={serializeDecimal(movements)}
    />;
}
