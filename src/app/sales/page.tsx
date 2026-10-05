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
        redirect("/login");
    }

    const isAdmin = session?.user?.role?.toUpperCase() === "ADMIN";

    const userFilter = {};
    
    const [
        rawProducts,
        rawWarehouses,
        rawDeliveries,
        rawReceipts,
        rawCustomers,
        rawSalesExpenses,
        rawSalesReturns,
        rawSalesOrders,
        rawSystemSettings
    ] = await Promise.all([
        prisma.product.findMany({
            include: { stocks: true },
            orderBy: { sku: 'asc' }
        }).catch(() => []),
        prisma.warehouse.findMany().catch(() => []),
        prisma.salesDelivery.findMany({
            where: userFilter,
            include: { 
                warehouse: true, 
                items: { include: { product: true, lotAllocations: true } },
                order: true
            },
            orderBy: { createdAt: 'desc' },
            
        }).catch(() => []),
        prisma.goodsReceipt.findMany({
            where: { isVerified: true },
            include: { items: true },
            orderBy: { createdAt: 'desc' },
            
        }).catch(() => []),
        prisma.customer.findMany({
            orderBy: { name: 'asc' }
        }).catch(() => []),
        prisma.financeTransaction.findMany({
            where: {
                journals: {
                    some: {
                        account: { code: { startsWith: '6' } }
                    }
                },
                ...(isAdmin ? {} : {
                    OR: [
                        { salesPerson: 'BC' },
                        { salesPerson: 'OWEN' },
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
            orderBy: { date: 'desc' },
            
        }),
        prisma.salesReturn.findMany({
            where: isAdmin ? {} : {
                OR: [
                    { delivery: { salesPerson: "BC" } },
                    { delivery: { salesPerson: "OWEN" } },
                    { createdById: session?.user?.id }
                ],
                NOT: { delivery: { salesPerson: "PF" } }
            },
            include: {
                delivery: { include: { items: { include: { product: true } } } },
                items: { include: { product: true } }
            },
            orderBy: { createdAt: 'desc' },
            
        }).catch(() => []),
        (prisma as any).salesOrder.findMany({
            where: isAdmin ? {} : {
                OR: [
                    { salesPerson: "BC" },
                    { salesPerson: "OWEN" },
                    { createdById: session?.user?.id }
                ],
                NOT: { salesPerson: "PF" }
            },
            include: { items: { include: { product: true } }, deliveries: true },
            orderBy: { date: 'desc' },
            
        }).catch(() => []),
        prisma.systemSetting.findUnique({ where: { id: "global" } }).catch(() => null)
    ]);

    const products = serializeDecimal(rawProducts);
    const warehouses = serializeDecimal(rawWarehouses);
    const deliveries = serializeDecimal(rawDeliveries);
    const receipts = serializeDecimal(rawReceipts);
    const serializedCustomers = serializeDecimal(rawCustomers);
    
    const salesExpenses = serializeDecimal(rawSalesExpenses.map((t: any) => ({
        ...t,
        accountCode: t.journals[0]?.account?.code
    })));
    const salesReturns = serializeDecimal(rawSalesReturns);
    const salesOrders = serializeDecimal(rawSalesOrders);
    const systemSettings = serializeDecimal(rawSystemSettings);

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
