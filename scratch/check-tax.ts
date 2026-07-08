import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const d = await prisma.salesDelivery.findMany({
        where: { date: { gte: new Date('2026-06-01T00:00:00Z') } },
        select: { invoiceNumber: true, taxRate: true, date: true },
        take: 10
    });
    console.log(d);
}

main().catch(console.error).finally(() => prisma.$disconnect());
