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
        where: { isVerified: true },
        include: { items: true },
        orderBy: { createdAt: 'desc' }
    }).catch(() => []));

    const serializedCustomers = serializeDecimal(await prisma.customer.findMany({
        orderBy: { name: 'asc' }
    }).catch(() => []));

    const salesExpenses = serializeDecimal(await prisma.$queryRawUnsafe(`
        SELECT t.*, a.code as "accountCode" FROM "FinanceTransaction" t
        JOIN "JournalEntry" j ON t.id = j."transactionId"
        JOIN "FinanceAccount" a ON j."accountId" = a.id
        WHERE a.code LIKE '6%'
        GROUP BY t.id
    `).catch(() => [])) as any[];

    return (
        <SalesDashboard
            initialDeliveries={deliveries}
            initialReceipts={receipts}
            products={products}
            warehouses={warehouses}
            customers={serializedCustomers}
            salesExpenses={salesExpenses}
        />
    );
}
