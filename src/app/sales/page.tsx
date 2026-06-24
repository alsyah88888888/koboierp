import { getPrisma } from "@/lib/prisma";
import SalesDashboard from "@/app/sales/SalesDashboard";
import { serializeDecimal } from "@/lib/utils";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/lib/auth";

export default async function SalesPage() {
    // Force dynamic rendering to skip build-time DB check
    await headers();
    
    const prisma = getPrisma();
    const session = await getServerSession(getAuthOptions()) as any;

    if (!session) {
        redirect("/api/auth/signin");
    }

    const isAdmin = session?.user?.role?.toUpperCase() === "ADMIN";

    const userFilter = {};
    
    const products = serializeDecimal(await prisma.product.findMany({
        include: { stocks: true },
        orderBy: { sku: 'asc' }
    }).catch(() => []));

    const warehouses = serializeDecimal(await prisma.warehouse.findMany().catch(() => []));

    const deliveries = serializeDecimal(await prisma.salesDelivery.findMany({
        where: userFilter,
        include: { 
            warehouse: true, 
            items: { include: { product: true, lotAllocations: true } },
            order: true
        },
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
        where: isAdmin ? {} : {
            OR: [
                { delivery: { salesPerson: "BC" } },
                { createdById: session?.user?.id }
            ],
            NOT: { delivery: { salesPerson: "PF" } }
        },
        include: {
            delivery: { include: { items: { include: { product: true } } } },
            items: { include: { product: true } }
        },
        orderBy: { createdAt: 'desc' }
    }).catch(() => []));

    const salesOrders = serializeDecimal(await (prisma as any).salesOrder.findMany({
        where: isAdmin ? {} : {
            OR: [
                { salesPerson: "BC" },
                { createdById: session?.user?.id }
            ],
            NOT: { salesPerson: "PF" }
        },
        include: { items: { include: { product: true } }, deliveries: true },
        orderBy: { date: 'desc' }
    }).catch(() => []));

    const systemSettings = serializeDecimal(await prisma.systemSetting.findUnique({ where: { id: "global" } }).catch(() => null));

    return (
        <SalesDashboard
            initialDeliveries={deliveries}
            initialReceipts={receipts}
            initialReturns={salesReturns}
            initialSalesOrders={salesOrders}
            products={products}
            warehouses={warehouses}
            customers={serializedCustomers}
            salesExpenses={salesExpenses}
            systemSettings={systemSettings}
        />
    );
}
