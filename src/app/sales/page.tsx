import prisma from "@/lib/prisma";
import SalesDashboard from "@/app/sales/SalesDashboard";

export default async function SalesPage() {
    const products = await prisma.product.findMany({
        include: { stocks: true },
        orderBy: { sku: 'asc' }
    }).catch(() => []);

    const warehouses = await prisma.warehouse.findMany().catch(() => []);
    const customers = (await prisma.customer.findMany({ orderBy: { name: 'asc' } }).catch(() => [])).map((c: any) => ({
        ...c,
        balance: Number(c.balance)
    }));

    const deliveries = (await prisma.salesDelivery.findMany({
        include: { warehouse: true, items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' }
    }).catch(() => [])).map((d: any) => ({
        ...d,
        items: d.items.map((i: any) => ({
            ...i,
            salesPrice: i.salesPrice ? Number(i.salesPrice) : 0
        }))
    }));

    const receipts = (await prisma.goodsReceipt.findMany({
        include: { items: true },
        orderBy: { createdAt: 'desc' }
    }).catch(() => [])).map((r: any) => ({
        ...r,
        items: r.items.map((i: any) => ({
            ...i,
            purchasePrice: i.purchasePrice ? Number(i.purchasePrice) : 0
        }))
    }));

    return <SalesDashboard initialDeliveries={deliveries} initialReceipts={receipts} products={products} warehouses={warehouses} customers={customers} />;
}
