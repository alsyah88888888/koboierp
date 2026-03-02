import prisma from "@/lib/prisma";
import SalesDashboard from "@/app/sales/SalesDashboard";
import { serializeDecimal } from "@/lib/utils";

export default async function SalesPage() {
    const products = await prisma.product.findMany({
        include: { stocks: true },
        orderBy: { sku: 'asc' }
    }).catch(() => []);

    const warehouses = await prisma.warehouse.findMany().catch(() => []);

    const deliveries = serializeDecimal(await prisma.salesDelivery.findMany({
        include: { warehouse: true, items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' }
    }).catch(() => []));

    const receipts = serializeDecimal(await prisma.goodsReceipt.findMany({
        include: { items: true },
        orderBy: { createdAt: 'desc' }
    }).catch(() => []));

    const serializedCustomers = serializeDecimal(await prisma.customer.findMany({
        orderBy: { name: 'asc' }
    }).catch(() => []));

    return (
        <SalesDashboard
            initialDeliveries={deliveries}
            initialReceipts={receipts}
            products={products}
            warehouses={warehouses}
            customers={serializedCustomers}
        />
    );
}
