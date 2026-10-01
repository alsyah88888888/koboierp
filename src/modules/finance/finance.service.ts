import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";

export async function createJournalEntry(data: {
    description: string;
    amount: number;
    type: "DEBIT" | "CREDIT";
    accountId: string;
}) {
    const prisma = getPrisma();
    return await prisma.journalEntry.create({
        data: {
            description: data.description,
            amount: new Prisma.Decimal(data.amount),
            type: data.type,
            accountId: data.accountId,
        }
    });
}

export async function getLedger(accountId: string) {
    const prisma = getPrisma();
    return await prisma.journalEntry.findMany({
        where: { accountId },
        orderBy: { date: 'desc' }
    });
}

export async function getBalanceSheet() {
    const prisma = getPrisma();
    const accounts = await prisma.financeAccount.findMany();
    
    const journalAggregations = await prisma.journalEntry.groupBy({
        by: ['accountId', 'type'],
        _sum: { amount: true }
    });

    return accounts.map((account: any) => {
        const isAssetOrExpense = account.type === "ASSET" || account.type === "EXPENSE";
        let balance = new Prisma.Decimal(0);

        const debits = journalAggregations.find((j: any) => j.accountId === account.id && j.type === "DEBIT")?._sum?.amount || 0;
        const credits = journalAggregations.find((j: any) => j.accountId === account.id && j.type === "CREDIT")?._sum?.amount || 0;

        if (isAssetOrExpense) {
            balance = balance.add(debits).sub(credits);
        } else {
            balance = balance.add(credits).sub(debits);
        }

        return {
            ...account,
            balance: balance.toNumber()
        };
    });
}

