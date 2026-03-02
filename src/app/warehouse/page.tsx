import prisma from "@/lib/prisma";
import { WarehouseDashboard } from "./WarehouseDashboard";
import { serializeDecimal } from "@/lib/utils";

export default async function WarehousePage() {
    const products = await prisma.product.findMany({
        include: { stocks: true },
        orderBy: { sku: 'asc' }
    }).catch(() => []);

    const warehouses = await prisma.warehouse.findMany().catch(() => []);

    const rawUnverified = (await prisma.$queryRawUnsafe(`SELECT id FROM GoodsReceipt WHERE isVerified = 0 ORDER BY createdAt DESC`).catch(() => [])) as any[];
    const ids = (rawUnverified || []).map(r => r.id);
    let unverifiedReceipts: any[] = [];
    if (ids.length > 0) {
        unverifiedReceipts = await (prisma.goodsReceipt.findMany({
            where: { id: { in: ids } },
            include: {
                items: { include: { product: true } },
                warehouse: true
            }
        }) as Promise<any[]>).catch(() => []);
    }

    // Manual relation fetch for StockMovement to avoid TS errors and schema migration issues
    const rawMovements = await prisma.stockMovement.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
    }).catch(() => []);

    const productIds = Array.from(new Set(rawMovements.map(m => m.productId)));
    const warehouseIds = Array.from(new Set(rawMovements.map(m => m.warehouseId)));

    const [movementProducts, movementWarehouses] = await Promise.all([
        prisma.product.findMany({ where: { id: { in: productIds } } }),
        prisma.warehouse.findMany({ where: { id: { in: warehouseIds } } })
    ]);

    const movements = rawMovements.map(m => ({
        ...m,
        product: movementProducts.find(p => p.id === m.productId),
        warehouse: movementWarehouses.find(w => w.id === m.warehouseId)
    }));

    return <WarehouseDashboard
        initialProducts={serializeDecimal(products)}
        warehouses={serializeDecimal(warehouses)}
        unverifiedReceipts={serializeDecimal(unverifiedReceipts)}
        movements={serializeDecimal(movements)}
    />;
}
