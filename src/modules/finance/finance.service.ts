import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import prisma from "@/lib/prisma";

export async function createJournalEntry(data: {
    description: string;
    amount: number;
    type: "DEBIT" | "CREDIT";
    accountId: string;
}) {
    return await prisma.journalEntry.create({
        data: {
            description: data.description,
            amount: new Decimal(data.amount),
            type: data.type,
            accountId: data.accountId,
        }
    });
}

export async function getLedger(accountId: string) {
    return await prisma.journalEntry.findMany({
        where: { accountId },
        orderBy: { date: 'desc' }
    });
}

export async function getBalanceSheet() {
    const accounts = await prisma.financeAccount.findMany({
        include: { journals: true }
    });

    return accounts.map((account: any) => {
        const balance = (account.journals as any[]).reduce((acc: any, journal: any) => {
            if (journal.type === "DEBIT") return acc.add(journal.amount);
            return acc.sub(journal.amount);
        }, new Decimal(0));

        const { journals, ...accountData } = account;
        return {
            ...accountData,
            balance: balance.toNumber()
        };
    });
}
