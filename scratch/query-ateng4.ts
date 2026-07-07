import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // find any financeTransaction where amount is 214634 or close to it
    const tx = await prisma.financeTransaction.findMany({
        where: { amount: { gte: 214000, lte: 215000 } }
    });
    console.log("Finance Transactions near 214634:");
    console.table(tx.map(t => ({ id: t.id, amount: t.amount, desc: t.description, ref: t.invoiceNumber })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
