import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const d1 = await prisma.salesDelivery.findUnique({ where: { deliveryNumber: 'SJ-182-03062026-001' }});
    const d2 = await prisma.salesDelivery.findUnique({ where: { deliveryNumber: 'SJ-729-05062026-006' }});
    
    console.log(`SJ-182 created at: ${d1?.createdAt}`);
    console.log(`SJ-729 created at: ${d2?.createdAt}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
