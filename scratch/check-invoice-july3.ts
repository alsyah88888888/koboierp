import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const inv = 'KB-TRN-02072026-005';
    const delivery: any = await prisma.salesDelivery.findFirst({
        where: { invoiceNumber: inv },
        include: { items: { include: { product: true } } }
    });

    if (!delivery) {
        console.log(`Invoice ${inv} not found.`);
        return;
    }

    console.log(delivery);
}

main().catch(console.error).finally(() => prisma.$disconnect());
