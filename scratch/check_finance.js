const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const transactions = await prisma.financeTransaction.findMany({
        take: 10,
        orderBy: { date: 'desc' }
    });
    console.log(transactions.map(t => ({ id: t.id, type: t.transactionType, category: t.category, amount: t.amount, date: t.date, desc: t.description, salesPerson: t.salesPerson })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
