import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const sd = await prisma.salesDelivery.findFirst({
        where: { deliveryNumber: 'SJ-266-10072026-003' },
        include: {
            items: { include: { product: true } },
            order: { include: { items: true } },
            warehouse: true,
            returns: true,
        }
    });
    console.log(JSON.stringify(sd, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
