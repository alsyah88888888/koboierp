import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const sales = await prisma.salesDelivery.findMany({
        where: { date: '2026-06-01T00:00:00.000Z' },
        select: { deliveryNumber: true, isVoid: true }
    });
    console.log(sales);
}
main().finally(() => prisma.$disconnect());
