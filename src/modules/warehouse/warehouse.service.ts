import { getPrisma } from "@/lib/prisma";

export async function getStockStatus(warehouseId: string) {
    const prisma = getPrisma();
    return await prisma.stock.findMany({
        where: { warehouseId },
        include: {
            product: true
        }
    });
}

export async function getLowStockProducts() {
    const prisma = getPrisma();
    // Simplistic check: total quantity across all warehouses below threshold
    const products = await prisma.product.findMany({
        include: { stocks: true }
    });

    return products.filter((p: any) => {
        const totalQty = (p.stocks as any[]).reduce((sum: number, s: any) => sum + s.quantity, 0);
        return totalQty <= p.lowStockThreshold;
    });
}

export async function getStockCard(productId: string, warehouseId: string) {
    const prisma = getPrisma();
    return await prisma.stockMovement.findMany({
        where: { productId, warehouseId },
        orderBy: { createdAt: 'desc' }
    });
}

