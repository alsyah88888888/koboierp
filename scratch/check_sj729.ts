import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const d2 = await prisma.salesDelivery.findUnique({
        where: { deliveryNumber: 'SJ-729-05062026-006' },
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
    
    console.log(JSON.stringify(d2, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
