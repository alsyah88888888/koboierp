import prisma from "@/lib/prisma";
import SalesDashboard from "@/app/sales/SalesDashboard";

export default async function SalesPage() {
    const products = await prisma.product.findMany({
        include: { stocks: true },
        orderBy: { sku: 'asc' }
    }).catch(() => []);

    const warehouses = await prisma.warehouse.findMany().catch(() => []);

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

    return <SalesDashboard initialDeliveries={deliveries} products={products} warehouses={warehouses} />;
}
