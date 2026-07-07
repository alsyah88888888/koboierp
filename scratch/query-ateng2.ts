import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const tx = await prisma.financeTransaction.findMany({
        where: { invoiceNumber: { contains: "KB-TRD-11062026" } },
        select: { id: true, amount: true, description: true, invoiceNumber: true }
    });
    console.log("\nFinance Transactions:");
    console.table(tx);
}

main().catch(console.error).finally(() => prisma.$disconnect());
