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

    const isAdmin = session.user?.role?.toUpperCase() === "ADMIN";
    const userFilter = isAdmin ? {} : { createdById: session.user.id };

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
        transactions,
        settledPurchases,
        settledSales
    ] = await Promise.all([
        getBalanceSheet().catch(() => []),
        prisma.journalEntry.findMany({
            include: { account: true, transaction: true },
            orderBy: { date: 'desc' },
            take: 50
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
            take: 50,
            include: { items: true, warehouse: true }
        }).catch(() => []),
        prisma.salesDelivery.findMany({
            where: { isVoid: false, paymentStatus: "PAID" },
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: { items: { include: { product: true } }, warehouse: true, order: true }
        }).catch(() => [])
    ]);

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

    // Serialize and transform
    const serializedLedger = serializeDecimal(ledger || []);
    const serializedVendors = serializeDecimal(vendors || []);
    const serializedCustomers = serializeDecimal(customers || []);

    const serializedPurchases = serializeDecimal(pendingPurchases || []).map((p: any) => ({
        ...p,
        total: calculateTotal(p.grandTotal, p.items, 'purchasePrice')
    }));

    const serializedSales = serializeDecimal(pendingSales || []).map((s: any) => ({
        ...s,
        total: calculateTotal(s.grandTotal, s.items, 'salesPrice')
    }));

    const serializedUnverifiedReceipts = serializeDecimal(unverifiedReceipts || []);
    const serializedPendingReturns = serializeDecimal(pendingReturns || []);
    const serializedPendingSalesReturns = serializeDecimal(pendingSalesReturns || []);
    const serializedPendingPurchaseRequests = serializeDecimal(pendingPurchaseRequests || []);
    const serializedTransactions = serializeDecimal(transactions || []);
    const serializedSettledPurchases = serializeDecimal(settledPurchases || []).map((p: any) => ({
        ...p,
        total: calculateTotal(p.grandTotal, p.items, 'purchasePrice')
    }));
    const serializedSettledSales = serializeDecimal(settledSales || []).map((s: any) => ({
        ...s,
        total: calculateTotal(s.grandTotal, s.items, 'salesPrice')
    }));

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
        />
    );
}

