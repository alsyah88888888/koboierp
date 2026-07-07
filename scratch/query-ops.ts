import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const tx = await prisma.financeTransaction.findMany({
        where: { invoiceNumber: { contains: "KB-TRD-11062026-003" } },
        select: { id: true, amount: true, transactionType: true, category: true, description: true, invoiceNumber: true }
    });
    console.log("FinanceTransactions matching KB-TRD-11062026-003:");
    console.table(tx);
}

main().catch(console.error).finally(() => prisma.$disconnect());
