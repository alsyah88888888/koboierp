import { getPrisma } from "@/lib/prisma";
import { getBalanceSheet } from "@/modules/finance/finance.service";
import { FinanceDashboard } from "./FinanceDashboard";
import { serializeDecimal } from "@/lib/utils";
import { getFinanceTransactionsAction } from "@/actions/finance";


import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/lib/auth";

export default async function FinancePage() {
    // Force dynamic rendering to skip build-time DB check
    await headers();
    
    const prisma = getPrisma();
    const session = await getServerSession(getAuthOptions()) as any;

    if (!session) {
        redirect("/api/auth/signin");
    }

    const userFilter = {};

    // Fetch all data in parallel for performance
    const [
        accounts,
        ledger,
        vendors,
        customers,
        pendingPurchases,
        pendingSales,
        unverifiedReceipts,
        pendingReturns,
        pendingSalesReturns,
        pendingPurchaseRequests,
        rawTransactions,
        settledPurchases,
        settledSales,
        totalPaidAPRes,
        totalPaidARRes,
        settledAPRaw,
        settledARRaw,
        paymentHistory,
        currentMonthPaidAPRes,
        currentMonthPaidARRes,
        dueSoonAPRes,
        overdueARRes
    ] = await Promise.all([
        getBalanceSheet().catch(() => []),
        prisma.journalEntry.findMany({
            include: { account: true, transaction: true },
            orderBy: { date: 'desc' },
            take: 200
        }).catch(() => []),
        prisma.vendor.findMany({
            orderBy: { balance: 'desc' },
            where: { balance: { not: 0 } }
        }).catch(() => []),
        prisma.customer.findMany({
            orderBy: { balance: 'desc' },
            where: { balance: { not: 0 } }
        }).catch(() => []),
        prisma.goodsReceipt.findMany({
            where: { isVoid: false, paymentStatus: { not: "PAID" } },
            orderBy: { createdAt: 'desc' },
            include: { items: true, warehouse: true }
        }).catch(() => []),
        prisma.salesDelivery.findMany({
            where: { isVoid: false, paymentStatus: { not: "PAID" } },
            orderBy: { createdAt: 'desc' },
            include: { items: { include: { product: true } }, warehouse: true, order: true }
        }).catch(() => []),
        prisma.goodsReceipt.findMany({
            where: { isVerified: false, isVoid: false },
            include: { items: { include: { product: true } }, warehouse: true },
            orderBy: { createdAt: 'desc' }
        }).catch(() => []),
        prisma.purchaseReturn.findMany({
            where: { status: 'PENDING', isVoid: false },
            include: { items: { include: { product: true } }, receipt: true },
            orderBy: { createdAt: 'desc' }
        }).catch(() => []),
        prisma.salesReturn.findMany({
            where: { status: 'PENDING', isVoid: false },
            include: { items: { include: { product: true } }, delivery: true },
            orderBy: { createdAt: 'desc' }
        }).catch(() => []),
        prisma.purchaseRequest.findMany({
            where: { status: 'APPROVED_BY_ADMIN' },
            include: { items: true, requestedBy: true, approvedBy: true },
            orderBy: { createdAt: 'desc' }
        }).catch(() => []),
        prisma.financeTransaction.findMany({
            where: userFilter,
            orderBy: { date: 'desc' },
            take: 200
        }).catch(() => []),
        prisma.goodsReceipt.findMany({
            where: { isVoid: false, paymentStatus: "PAID" },
            orderBy: { createdAt: 'desc' },
            take: 200,
            include: { items: { include: { product: true } }, warehouse: true, createdBy: { select: { name: true } } }
        }).catch(() => []),
        prisma.salesDelivery.findMany({
            where: { isVoid: false, paymentStatus: "PAID" },
            orderBy: { updatedAt: 'desc' },
            take: 200,
            include: { items: { include: { product: true } }, warehouse: true, order: true, createdBy: { select: { name: true } } }
        }).catch(() => []),
        prisma.goodsReceipt.aggregate({
            where: { isVoid: false },
            _sum: { paidAmount: true }
        }).catch(() => ({ _sum: { paidAmount: 0 } })),
        prisma.salesDelivery.aggregate({
            where: { isVoid: false },
            _sum: { paidAmount: true }
        }).catch(() => ({ _sum: { paidAmount: 0 } })),
        prisma.goodsReceipt.findMany({
            where: { 
                isVoid: false, 
                paymentStatus: "PAID", 
                date: { gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1) } 
            },
            select: { date: true, paidAmount: true }
        }).catch(() => []),
        prisma.salesDelivery.findMany({
            where: { 
                isVoid: false, 
                paymentStatus: "PAID", 
                date: { gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1) } 
            },
            select: { date: true, paidAmount: true }
        }).catch(() => []),
        prisma.journalEntry.findMany({
            where: {
                account: { code: { in: ["101", "102", "106", "107", "108"] } }
            },
            include: { account: true },
            orderBy: { date: 'desc' },
            take: 500
        }).catch(() => []),
        prisma.goodsReceipt.aggregate({
            where: { 
                isVoid: false, 
                date: { 
                    gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
                } 
            },
            _sum: { paidAmount: true }
        }).catch(() => ({ _sum: { paidAmount: 0 } })),
        prisma.salesDelivery.aggregate({
            where: { 
                isVoid: false, 
                date: { 
                    gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
                } 
            },
            _sum: { paidAmount: true }
        }).catch(() => ({ _sum: { paidAmount: 0 } })),
        prisma.goodsReceipt.aggregate({
            where: { 
                isVoid: false, 
                paymentStatus: { not: "PAID" },
                date: { lt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }
            },
            _sum: { grandTotal: true, paidAmount: true }
        }).catch(() => ({ _sum: { grandTotal: 0, paidAmount: 0 } })),
        prisma.salesDelivery.aggregate({
            where: { 
                isVoid: false, 
                paymentStatus: { not: "PAID" },
                date: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            },
            _sum: { grandTotal: true, paidAmount: true }
        }).catch(() => ({ _sum: { grandTotal: 0, paidAmount: 0 } }))
    ]);

    // Fetch journals separately for the transactions to populate relation data in OperationalModal
    const txIds = rawTransactions.map((t: any) => t.id);
    const txJournals = await prisma.journalEntry.findMany({
        where: { transactionId: { in: txIds } },
        include: { account: true }
    }).catch(() => []);

    const transactions = rawTransactions.map((t: any) => ({
        ...t,
        journals: txJournals.filter((j: any) => j.transactionId === t.id)
    }));

    // Helper to calculate total safely without NaN
    const calculateTotal = (grandTotal: any, items: any[], priceField: string) => {
        const gt = Number(grandTotal || 0);
        if (gt > 0) return gt;
        return (items || []).reduce((sum: number, i: any) => {
            const qty = Number(i.quantity || 0);
            const price = Number(i[priceField] || 0);
            const disc = Number(i.discount || 0);
            const line = (qty * price) - disc;
            return sum + (isNaN(line) ? 0 : line);
        }, 0);
    };

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
                    total: 0,
                    isGrouped: true,
                    groupedIds: []
                });
            }
            const g = grouped.get(key);
            g.subtotal += Number(s.subtotal || 0);
            g.totalDiscount += Number(s.totalDiscount || 0);
            g.taxAmount += Number(s.taxAmount || 0);
            g.grandTotal += Number(s.grandTotal || 0);
            g.paidAmount += Number(s.paidAmount || 0);
            g.total += Number(s.total || 0);
            g.groupedIds.push(s.id);
        }
        
        return Array.from(grouped.values()).map(g => {
            if (g.paidAmount >= g.total && g.total > 0) {
                g.paymentStatus = 'PAID';
            } else if (g.paidAmount > 0) {
                g.paymentStatus = 'PARTIAL';
            } else {
                g.paymentStatus = 'PENDING';
            }
            return g;
        });
    };

    // Serialize and transform
    const serializedLedger = serializeDecimal(ledger || []);
    const serializedVendors = serializeDecimal(vendors || []);
    const serializedCustomers = serializeDecimal(customers || []);

    const serializedPurchases = serializeDecimal(pendingPurchases || []).map((p: any) => ({
        ...p,
        total: calculateTotal(p.grandTotal, p.items, 'purchasePrice')
    }));

    const serializedSales = groupSalesByInvoice(serializeDecimal(pendingSales || []).map((s: any) => ({
        ...s,
        total: calculateTotal(s.grandTotal, s.items, 'salesPrice')
    })));

    const serializedUnverifiedReceipts = serializeDecimal(unverifiedReceipts || []);
    const serializedPendingReturns = serializeDecimal(pendingReturns || []);
    const serializedPendingSalesReturns = serializeDecimal(pendingSalesReturns || []);
    const serializedPendingPurchaseRequests = serializeDecimal(pendingPurchaseRequests || []);
    const serializedTransactions = serializeDecimal(transactions || []);
    const serializedSettledPurchases = serializeDecimal(settledPurchases || []).map((p: any) => ({
        ...p,
        total: calculateTotal(p.grandTotal, p.items, 'purchasePrice')
    }));
    const serializedSettledSales = groupSalesByInvoice(serializeDecimal(settledSales || []).map((s: any) => ({
        ...s,
        total: calculateTotal(s.grandTotal, s.items, 'salesPrice')
    })));

    // Process Monthly Stats
    const monthlyStats = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const m = d.getMonth();
        const y = d.getFullYear();
        const label = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });

        const apSum = settledAPRaw
            .filter((p: any) => p.date && new Date(p.date).getMonth() === m && new Date(p.date).getFullYear() === y)
            .reduce((sum: number, p: any) => sum + Number(p.paidAmount || 0), 0);

        const arSum = settledARRaw
            .filter((s: any) => s.date && new Date(s.date).getMonth() === m && new Date(s.date).getFullYear() === y)
            .reduce((sum: number, s: any) => sum + Number(s.paidAmount || 0), 0);

        monthlyStats.push({ label, ap: apSum, ar: arSum });
    }

    return (
        <FinanceDashboard
            accounts={accounts}
            ledger={serializedLedger}
            vendors={serializedVendors}
            customers={serializedCustomers}
            pendingPurchases={serializedPurchases}
            pendingSales={serializedSales}
            unverifiedReceipts={serializedUnverifiedReceipts}
            pendingReturns={serializedPendingReturns}
            pendingSalesReturns={serializedPendingSalesReturns}
            pendingPurchaseRequests={serializedPendingPurchaseRequests}
            transactions={serializedTransactions}
            settledPurchases={serializedSettledPurchases}
            settledSales={serializedSettledSales}
            totalPaidAP={Number(totalPaidAPRes?._sum?.paidAmount || 0)}
            totalPaidAR={Number(totalPaidARRes?._sum?.paidAmount || 0)}
            currentMonthPaidAP={Number(currentMonthPaidAPRes?._sum?.paidAmount || 0)}
            currentMonthPaidAR={Number(currentMonthPaidARRes?._sum?.paidAmount || 0)}
            dueSoonAP={Number(dueSoonAPRes?._sum?.grandTotal || 0) - Number(dueSoonAPRes?._sum?.paidAmount || 0)}
            overdueAR={Number(overdueARRes?._sum?.grandTotal || 0) - Number(overdueARRes?._sum?.paidAmount || 0)}
            monthlyStats={monthlyStats}
            paymentHistory={serializeDecimal(paymentHistory || [])}
        />
    );
}

