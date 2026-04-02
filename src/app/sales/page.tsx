export const dynamic = 'force-dynamic';

import prisma from "@/lib/prisma";
import SalesDashboard from "@/app/sales/SalesDashboard";
import { serializeDecimal } from "@/lib/utils";

import { headers } from "next/headers";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export default async function SalesPage() {
    // Force dynamic rendering to skip build-time DB check
    await headers();
    
    const session = await getServerSession(authOptions) as any;
    const isAdmin = session?.user?.role === "ADMIN";
    
    // Strict filter for Sales: must be "BC" or owned by her (if no salesperson code is set)
    // and explicitly NOT "PF" if she is the one seeing it.
    const userFilter = isAdmin ? {} : { 
        OR: [
            { salesPerson: "BC" },
            { createdById: session?.user?.id }
        ],
        NOT: { salesPerson: "PF" } // Redundant but safe
    };
    
    const products = serializeDecimal(await prisma.product.findMany({
        include: { stocks: true },
        orderBy: { sku: 'asc' }
    }).catch(() => []));

    const warehouses = serializeDecimal(await prisma.warehouse.findMany().catch(() => []));

    const deliveries = serializeDecimal(await prisma.salesDelivery.findMany({
        where: userFilter,
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

    let expenseWhere = 'a.code LIKE \'6%\'';
    if (!isAdmin) {
        expenseWhere += ` AND (t."salesPerson" = 'BC' OR t."createdById" = '${session?.user?.id}') AND t."salesPerson" != 'PF'`;
    }

    const salesExpenses = serializeDecimal(await prisma.$queryRawUnsafe(`
        SELECT DISTINCT ON (t.id) t.*, a.code as "accountCode" FROM "FinanceTransaction" t
        JOIN "JournalEntry" j ON t.id = j."transactionId"
        JOIN "FinanceAccount" a ON j."accountId" = a.id
        WHERE ${expenseWhere}
        ORDER BY t.id
    `).catch(() => [])) as any[];

    const salesReturns = serializeDecimal(await prisma.salesReturn.findMany({
        where: userFilter,
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
