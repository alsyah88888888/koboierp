import { PrismaClient } from '@prisma/client';
async function main() {
    const prisma = new PrismaClient();
    const deliveries = await prisma.salesDelivery.findMany({
        take: 10,
        select: { invoiceNumber: true }
    });
    console.log(deliveries);
}
main().finally(() => process.exit(0));
