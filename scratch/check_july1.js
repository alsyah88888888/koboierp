const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const sales = await prisma.salesDelivery.findMany({
        where: { date: { gte: new Date('2026-07-01T00:00:00.000Z'), lte: new Date('2026-07-01T23:59:59.000Z') } },
        select: { deliveryNumber: true, date: true, grandTotal: true }
    });
    console.log("July 1st Sales:", sales);
}
main().finally(() => prisma.$disconnect());
