const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const sales = await prisma.salesDelivery.findMany({
        where: { date: { gte: new Date('2026-05-31T00:00:00.000Z'), lte: new Date('2026-06-02T23:59:59.000Z') } },
        select: { id: true, deliveryNumber: true, date: true }
    });
    console.log(sales);
}

main().finally(() => prisma.$disconnect());
