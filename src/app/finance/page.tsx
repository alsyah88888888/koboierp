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

    // Serialize Decimal objects for Client Component
    const serializedLedger = ledger.map((entry: any) => ({
        ...entry,
        amount: Number(entry.amount),
        transaction: entry.transaction ? {
            ...entry.transaction,
            amount: Number(entry.transaction.amount)
        } : null
    }));

    return <FinanceDashboard accounts={accounts} ledger={serializedLedger} />;
}

import { cn } from "@/lib/utils";
