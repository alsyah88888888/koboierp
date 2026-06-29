import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const sj182 = await prisma.salesDelivery.findUnique({
        where: { deliveryNumber: 'SJ-182-03062026-001' },
        include: {
            items: {
                include: {
                    lotAllocations: {
                        include: { lot: true }
                    }
                }
            }
        }
    });
    
    console.log(JSON.stringify(sj182, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
