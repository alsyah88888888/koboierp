import prisma from "@/lib/prisma";
import { OperationalDashboard } from "./OperationalDashboard";
import { serializeDecimal } from "@/lib/utils";

export default async function OperationalPage() {
    // Use raw query to bypass client schema validation for salesPerson field
    const transactions: any[] = await prisma.$queryRawUnsafe(`
        SELECT * FROM "FinanceTransaction" ORDER BY "date" DESC
    `);

    // Fetch journals separately and merge to maintain relation data
    const transactionIds = transactions.map(t => t.id);
    const journals = await prisma.journalEntry.findMany({
        where: { transactionId: { in: transactionIds } },
        include: { account: true }
    });

    const transactionsWithJournals = transactions.map(t => ({
        ...t,
        journals: journals.filter(j => j.transactionId === t.id)
    }));

    const coa = await prisma.financeAccount.findMany({
        orderBy: { code: 'asc' }
    });

    // Serialize Decimal for client
    const serializedTransactions = serializeDecimal(transactionsWithJournals);
    const serializedCoa = serializeDecimal(coa);

    return (
        <OperationalDashboard
            transactions={serializedTransactions}
            coa={serializedCoa}
        />
    );
}
