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

    // Helper to group sales by invoice number to avoid duplicates
    const groupSalesByInvoice = (salesArray: any[]) => {
        const grouped = new Map<string, any>();
        for (const s of salesArray) {
            const key = s.invoiceNumber || s.deliveryNumber; 
            if (!grouped.has(key)) {
                grouped.set(key, {
                    ...s,
                    id: `GROUP_${key}`,
                    deliveryNumber: key, 
                    subtotal: 0,
                    totalDiscount: 0,
                    taxAmount: 0,
                    grandTotal: 0,
                    paidAmount: 0,
                    isGrouped: true,
                    groupedIds: [],
                    items: [],
                    warehouse: s.warehouse || { name: '-' },
                    recipient: s.recipient || '',
                    order: s.order || null,
                    createdAt: s.createdAt,
                    buyerName: s.buyerName || '',
                    salesPerson: s.salesPerson || '',
                    isVoid: s.isVoid || false
                });
            }
            const g = grouped.get(key);
            g.subtotal += Number(s.subtotal || 0);
            g.totalDiscount += Number(s.totalDiscount || 0);
            g.taxAmount += Number(s.taxAmount || 0);
            g.grandTotal += Number(s.grandTotal || 0);
            g.paidAmount += Number(s.paidAmount || 0);
            g.groupedIds.push(s.id);
            if (s.items) {
                g.items.push(...s.items);
            }
        }
        
        return Array.from(grouped.values()).map(g => {
            if (g.paidAmount >= g.grandTotal && g.grandTotal > 0) {
                g.paymentStatus = 'PAID';
            } else if (g.paidAmount > 0) {
                g.paymentStatus = 'PARTIAL';
            } else {
                g.paymentStatus = 'PENDING';
            }
            return g;
        });
    };

    const rawDeliveries = await prisma.salesDelivery.findMany({
        where: userFilter,
        include: { 
            warehouse: true, 
            items: { include: { product: true, lotAllocations: true } },
            order: true
        },
        orderBy: { createdAt: 'desc' }
    }).catch(() => []);

    const deliveries = serializeDecimal(groupSalesByInvoice(rawDeliveries));

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
