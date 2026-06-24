const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const start = new Date('2026-05-31T17:00:00.000Z');
    const end = new Date('2026-06-01T16:59:59.999Z');
    const ops = await prisma.financeTransaction.findMany({
        where: { date: { gte: start, lte: end } }
    });
    console.log("Ops on June 1st:", ops);
}
main().finally(() => prisma.$disconnect());
