import prisma from "@/lib/prisma";
import { PurchaseDashboard } from "./PurchaseDashboard";

export default async function PurchasePage() {
    // We only need products, warehouses, and the new GoodsReceipts
    const products = await prisma.product.findMany({
        select: { id: true, sku: true, name: true, uom: true, barcode: true },
        orderBy: { sku: 'asc' }
    }).catch(() => []);

    const warehouses = await prisma.warehouse.findMany().catch(() => []);

    const receipts = await prisma.goodsReceipt.findMany({
        include: { warehouse: true, items: true },
        orderBy: { createdAt: 'desc' }
    }).catch(() => []);

    // Serialize Decimal objects for Client Component
    const serializedReceipts = receipts.map((r: any) => ({
        ...r,
        items: r.items.map((i: any) => ({
            ...i,
            purchasePrice: i.purchasePrice ? Number(i.purchasePrice) : 0
        }))
    }));

    return <PurchaseDashboard initialReceipts={serializedReceipts} products={products} warehouses={warehouses} />;
}
