import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const startDate = new Date(2026, 5, 1);
    const endDate = new Date(2026, 6, 0, 23, 59, 59, 999);
    
    const sales = await prisma.salesDelivery.groupBy({
        by: ['salesPerson'],
        where: { isVoid: false, date: { gte: startDate, lte: endDate } },
        _sum: { grandTotal: true }
    });
    console.log(sales);
}
main().catch(console.error).finally(() => prisma.$disconnect());
