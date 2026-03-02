import prisma from "@/lib/prisma";
import { getBalanceSheet } from "@/modules/finance/finance.service";
import { FinanceDashboard } from "./FinanceDashboard";
import { serializeDecimal } from "@/lib/utils";
import { getFinanceTransactionsAction } from "../actions";

export default async function FinancePage() {
    const accounts = await getBalanceSheet().catch(() => []);

    const ledger = await prisma.journalEntry.findMany({
        include: {
            account: true,
            transaction: true
        },
        orderBy: { date: 'desc' },
        take: 50
    }).catch(() => []);

    const vendors = await (prisma.vendor as any).findMany({
        orderBy: { balance: 'desc' },
        where: { balance: { not: 0 } }
    }).catch(() => []);

    const customers = await (prisma.customer as any).findMany({
        orderBy: { balance: 'desc' },
        where: { balance: { not: 0 } }
    }).catch(() => []);

    const pendingPurchases = await (prisma.goodsReceipt as any).findMany({
        where: { paymentStatus: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        include: { items: true }
    }).catch(() => []);

    const pendingSales = await (prisma.salesDelivery as any).findMany({
        where: { paymentStatus: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        include: { items: true }
    }).catch(() => []);

    const unverifiedReceipts = await prisma.goodsReceipt.findMany({
        where: { isVerified: false },
        include: { items: { include: { product: true } }, warehouse: true },
        orderBy: { createdAt: 'desc' }
    }).catch(() => []);

    const transactions = await getFinanceTransactionsAction().catch(() => []);

    // Serialize Decimal objects for Client Component
    const serializedLedger = serializeDecimal(ledger);
    const serializedVendors = serializeDecimal(vendors);
    const serializedCustomers = serializeDecimal(customers);

    // Add calculated totals for display
    const serializedPurchases = serializeDecimal(pendingPurchases).map((p: any) => ({
        ...p,
        total: p.items.reduce((sum: number, i: any) => sum + (i.quantity * i.purchasePrice), 0)
    }));

    const serializedSales = serializeDecimal(pendingSales).map((s: any) => ({
        ...s,
        total: s.items.reduce((sum: number, i: any) => sum + (i.quantity * (s.salesPrice || 0)), 0)
    }));

    const serializedUnverifiedReceipts = serializeDecimal(unverifiedReceipts);
    const serializedTransactions = serializeDecimal(transactions);

    return (
        <FinanceDashboard
            accounts={accounts}
            ledger={serializedLedger}
            vendors={serializedVendors}
            customers={serializedCustomers}
            pendingPurchases={serializedPurchases}
            pendingSales={serializedSales}
            unverifiedReceipts={serializedUnverifiedReceipts}
            transactions={serializedTransactions}
        />
    );
}

