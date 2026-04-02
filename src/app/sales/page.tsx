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
    const isAdmin = session?.user?.role?.toUpperCase() === "ADMIN";
    
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

    const salesExpensesRaw = await prisma.financeTransaction.findMany({
        where: {
            journals: {
                some: {
                    account: { code: { startsWith: '6' } }
                }
            },
            ...(isAdmin ? {} : {
                OR: [
                    { salesPerson: 'BC' },
                    { createdById: session?.user?.id }
                ],
                NOT: { salesPerson: 'PF' }
            })
        },
        include: {
            journals: {
                where: { account: { code: { startsWith: '6' } } },
                include: { account: true }
            }
        },
        orderBy: { date: 'desc' }
    });

    const salesExpenses = serializeDecimal(salesExpensesRaw.map((t: any) => ({
        ...t,
        accountCode: t.journals[0]?.account?.code
    })));

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
