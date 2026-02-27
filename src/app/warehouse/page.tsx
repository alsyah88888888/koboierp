import prisma from "@/lib/prisma";
import { WarehouseDashboard } from "./WarehouseDashboard";

export default async function WarehousePage() {
    const products = await prisma.product.findMany({
        include: { stocks: true },
        orderBy: { sku: 'asc' }
    }).catch(() => []);

    const warehouses = await prisma.warehouse.findMany().catch(() => []);

    const rawUnverified = (await prisma.$queryRaw`SELECT id FROM GoodsReceipt WHERE isVerified = 0 ORDER BY createdAt DESC`.catch(() => [])) as any[];
    const ids = (rawUnverified || []).map(r => r.id);

    let unverifiedReceipts: any[] = [];
    if (ids.length > 0) {
        unverifiedReceipts = await prisma.goodsReceipt.findMany({
            where: { id: { in: ids } },
            include: {
                items: { include: { product: true } },
                warehouse: true
            }
        }).catch(() => []);
    }

    return <WarehouseDashboard
        initialProducts={products}
        warehouses={warehouses}
        unverifiedReceipts={unverifiedReceipts}
    />;
}
