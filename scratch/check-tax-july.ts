import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const d = await prisma.salesDelivery.findMany({
        where: { invoiceNumber: { contains: '02072026' } },
        select: { invoiceNumber: true, taxRate: true, date: true }
    });
    console.log(d);
}

main().catch(console.error).finally(() => prisma.$disconnect());
