const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const sales = await prisma.salesDelivery.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { deliveryNumber: true, date: true, createdAt: true }
    });
    console.log("Recent Sales:", sales);
}
main().finally(() => prisma.$disconnect());
