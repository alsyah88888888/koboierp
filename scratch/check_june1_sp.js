const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const sales = await prisma.salesDelivery.findMany({
        where: { date: '2026-06-01T00:00:00.000Z', isVoid: false },
        select: { deliveryNumber: true, salesPerson: true, grandTotal: true }
    });
    console.log(sales);
}
main().finally(() => prisma.$disconnect());
