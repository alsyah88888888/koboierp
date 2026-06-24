const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const sales = await prisma.salesDelivery.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 3,
        select: { deliveryNumber: true, date: true, updatedAt: true }
    });
    console.log("Latest Updated Sales:", sales);
}
main().finally(() => prisma.$disconnect());
