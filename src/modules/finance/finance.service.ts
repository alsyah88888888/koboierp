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
    const accounts = await prisma.financeAccount.findMany({
        include: { journals: true }
    });

    return accounts.map((account: any) => {
        const isAssetOrExpense = account.type === "ASSET" || account.type === "EXPENSE";

        const balance = (account.journals as any[]).reduce((acc: any, journal: any) => {
            if (isAssetOrExpense) {
                if (journal.type === "DEBIT") return acc.add(journal.amount);
                return acc.sub(journal.amount);
            } else {
                if (journal.type === "CREDIT") return acc.add(journal.amount);
                return acc.sub(journal.amount);
            }
        }, new Prisma.Decimal(0));

        const { journals: _journals, ...accountData } = account;
        return {
            ...accountData,
            balance: balance.toNumber()
        };
    });
}

