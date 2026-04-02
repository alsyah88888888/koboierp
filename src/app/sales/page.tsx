export const dynamic = 'force-dynamic';

import prisma from "@/lib/prisma";
import SalesDashboard from "@/app/sales/SalesDashboard";
import { serializeDecimal } from "@/lib/utils";

import { headers } from "next/headers";

export default async function SalesPage() {
    // Force dynamic rendering to skip build-time DB check
    await headers();
    
    const products = serializeDecimal(await prisma.product.findMany({
        include: { stocks: true },
        orderBy: { sku: 'asc' }
    }).catch(() => []));

    const warehouses = serializeDecimal(await prisma.warehouse.findMany().catch(() => []));

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
        SELECT DISTINCT ON (t.id) t.*, a.code as "accountCode" FROM "FinanceTransaction" t
        JOIN "JournalEntry" j ON t.id = j."transactionId"
        JOIN "FinanceAccount" a ON j."accountId" = a.id
        WHERE a.code LIKE '6%'
        ORDER BY t.id
    `).catch(() => [])) as any[];

    const salesReturns = serializeDecimal(await prisma.salesReturn.findMany({
        include: {
            delivery: { include: { items: { include: { product: true } } } },
            items: { include: { product: true } }
        },
        orderBy: { createdAt: 'desc' }
    }).catch(() => []));

    return (
        <SalesDashboard
            initialDeliveries={deliveries}
            initialReceipts={receipts}
            initialReturns={salesReturns}
            products={products}
            warehouses={warehouses}
            customers={serializedCustomers}
            salesExpenses={salesExpenses}
        />
    );
}
