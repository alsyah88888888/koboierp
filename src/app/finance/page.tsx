import prisma from "@/lib/prisma";
import { getBalanceSheet } from "@/modules/finance/finance.service";
import { FinanceDashboard } from "./FinanceDashboard";

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
        where: { balance: { gt: 0 } }
    }).catch(() => []);

    const customers = await (prisma.customer as any).findMany({
        orderBy: { balance: 'desc' },
        where: { balance: { gt: 0 } }
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

    // Serialize Decimal objects for Client Component
    const serializedLedger = ledger.map((entry: any) => ({
        ...entry,
        amount: Number(entry.amount),
        transaction: entry.transaction ? {
            ...entry.transaction,
            amount: Number(entry.transaction.amount)
        } : null
    }));

    const serializedVendors = vendors.map((v: any) => ({ ...v, balance: Number(v.balance) }));
    const serializedCustomers = customers.map((c: any) => ({ ...c, balance: Number(c.balance) }));

    const serializedPurchases = pendingPurchases.map((p: any) => ({
        ...p,
        total: p.items.reduce((sum: number, i: any) => sum + (i.quantity * Number(i.purchasePrice)), 0),
        items: p.items.map((i: any) => ({
            ...i,
            purchasePrice: Number(i.purchasePrice)
        }))
    }));

    const serializedSales = pendingSales.map((s: any) => ({
        ...s,
        total: s.items.reduce((sum: number, i: any) => sum + (i.quantity * Number(i.salesPrice || 0)), 0),
        items: s.items.map((i: any) => ({
            ...i,
            salesPrice: Number(i.salesPrice || 0)
        }))
    }));

    const serializedUnverifiedReceipts = unverifiedReceipts.map((r: any) => ({
        ...r,
        items: r.items.map((i: any) => ({
            ...i,
            purchasePrice: Number(i.purchasePrice)
        }))
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
        />
    );
}

import { cn } from "@/lib/utils";
