import { getPrisma } from "@/lib/prisma";
import { OperationalDashboard } from "./OperationalDashboard";
import { serializeDecimal } from "@/lib/utils";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";

export default async function OperationalPage() {
    // Force dynamic rendering to skip build-time DB check
    await headers();
    
    const prisma = getPrisma();
    const session = await getServerSession(getAuthOptions()) as any;

    if (!session) {
        redirect("/login");
    }


    const [
        transactions,
        coa,
        deliveries,
        receipts
    ] = await Promise.all([
        prisma.financeTransaction.findMany({
            where: {
                category: { notIn: ["PEMBELIAN", "PENJUALAN", "TRANSFER"] },
                ...(session?.user?.email === 'chici@kolaborasi.id' ? { salesPerson: 'BC' } : {})
            },
            orderBy: { date: 'desc' },
            take: 100
        }),
        prisma.financeAccount.findMany({
            orderBy: { code: 'asc' }
        }),
        prisma.salesDelivery.findMany({
            include: { items: true },
            orderBy: { createdAt: 'desc' },
            take: 100
        }).catch(() => []),
        prisma.goodsReceipt.findMany({
            where: { isVerified: true },
            include: { items: true },
            orderBy: { createdAt: 'desc' },
            take: 100
        }).catch(() => [])
    ]);

    // Fetch journals separately and merge to maintain relation data
    const transactionIds = transactions.map((t: any) => t.id);
    const journals = await prisma.journalEntry.findMany({
        where: { transactionId: { in: transactionIds } },
        include: { account: true }
    });

    const transactionsWithJournals = transactions.map((t: any) => ({
        ...t,
        journals: journals.filter((j: any) => j.transactionId === t.id)
    }));

    // Serialize Decimal for client
    const serializedTransactions = serializeDecimal(transactionsWithJournals);
    const serializedCoa = serializeDecimal(coa);
    const serializedDeliveries = serializeDecimal(deliveries);
    const serializedReceipts = serializeDecimal(receipts);

    return (
        <OperationalDashboard
            transactions={serializedTransactions}
            coa={serializedCoa}
            initialDeliveries={serializedDeliveries}
            initialReceipts={serializedReceipts}
            userEmail={session?.user?.email || undefined}
        />
    );
}
