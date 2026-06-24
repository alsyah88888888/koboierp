import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const startDate = new Date('2026-06-22T00:00:00.000+07:00');
    const endDate = new Date('2026-06-28T23:59:59.999+07:00');

    const operational = await prisma.financeTransaction.findMany({
        where: { 
            date: { gte: startDate, lte: endDate }
        }
    });
    console.log("Found operational records:", operational.length);
    let totalOps = 0;
    for (let i = 0; i < 7; i++) {
        const dayStart = new Date(startDate);
        dayStart.setDate(dayStart.getDate() + i);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        const dayOps = operational.filter(o => new Date(o.date) >= dayStart && new Date(o.date) <= dayEnd);
        const opsExpense = dayOps.filter(o => o.transactionType === 'PAYMENT' || o.transactionType === 'EXPENSE' || Number(o.amount) < 0)
            .reduce((s, o) => s + Math.abs(Number(o.amount)), 0);
        totalOps += opsExpense;
        console.log(`Day ${i+1}: start=${dayStart.toISOString()} end=${dayEnd.toISOString()} -> ops=${opsExpense} from ${dayOps.length} transactions`);
    }
    console.log("Total Ops:", totalOps);
}
main().finally(() => prisma.$disconnect());
