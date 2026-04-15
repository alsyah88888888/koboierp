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
    // 1. Fetch Products and Warehouses
    const [products, warehouses] = await Promise.all([
        prisma.product.findMany({
            include: { stocks: true },
            orderBy: { sku: 'asc' }
        }).catch(() => []),
        prisma.warehouse.findMany().catch(() => [])
    ]);

    // 2. Fetch Unverified Receipts
    const unverifiedReceiptsRaw = await prisma.goodsReceipt.findMany({
        where: { isVerified: false, isVoid: false },
        include: { 
            items: { include: { product: true } },
            warehouse: true 
        },
        orderBy: { createdAt: 'desc' },
        take: 50
    }).catch(() => []);

    // 3. Fetch Recent Movements
    const rawMovements = await prisma.stockMovement.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
    }).catch(() => []);

    const productIds = Array.from(new Set(rawMovements.map((m: any) => m.productId))).filter(Boolean);
    const warehouseIds = Array.from(new Set(rawMovements.map((m: any) => m.warehouseId))).filter(Boolean);

    const [movementProducts, movementWarehouses] = await Promise.all([
        prisma.product.findMany({ where: { id: { in: productIds } } }).catch(() => []),
        prisma.warehouse.findMany({ where: { id: { in: warehouseIds } } }).catch(() => [])
    ]);

    // 4. Transform and POJO-ify for serialization safety
    const movements = rawMovements.map((m: any) => {
        const product = movementProducts.find((p: any) => p.id === m.productId);
        const warehouse = movementWarehouses.find((w: any) => w.id === m.warehouseId);
        return {
            ...JSON.parse(JSON.stringify(m)),
            product: product ? JSON.parse(JSON.stringify(product)) : null,
            warehouse: warehouse ? JSON.parse(JSON.stringify(warehouse)) : null
        };
    });

    const safeProducts = products.map((p: any) => ({
        ...JSON.parse(JSON.stringify(p)),
        stocks: p.stocks.map((s: any) => JSON.parse(JSON.stringify(s)))
    }));

    const safeUnverifiedReceipts = unverifiedReceiptsRaw.map((r: any) => ({
        ...JSON.parse(JSON.stringify(r)),
        warehouse: r.warehouse ? JSON.parse(JSON.stringify(r.warehouse)) : null,
        items: r.items.map((i: any) => ({
            ...JSON.parse(JSON.stringify(i)),
            product: i.product ? JSON.parse(JSON.stringify(i.product)) : null
        }))
    }));

    return <WarehouseDashboard
        initialProducts={serializeDecimal(safeProducts)}
        warehouses={serializeDecimal(warehouses.map(w => JSON.parse(JSON.stringify(w))))}
        unverifiedReceipts={serializeDecimal(safeUnverifiedReceipts)}
        movements={serializeDecimal(movements)}
    />;
}
