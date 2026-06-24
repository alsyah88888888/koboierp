import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const start = new Date('2026-06-01T00:00:00.000+07:00');
    const end = new Date('2026-06-01T23:59:59.999+07:00');
    
    const sales = await prisma.salesDelivery.count({
        where: { date: { gte: start, lte: end } }
    });
    
    const purchases = await prisma.goodsReceipt.count({
        where: { date: { gte: start, lte: end } }
    });
    
    console.log(`June 1st - Sales: ${sales}, Purchases: ${purchases}`);
}

main().finally(() => prisma.$disconnect());
