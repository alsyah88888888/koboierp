import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const allocs = await prisma.lotAllocation.findMany({
        where: { lotId: 'cmpwaikem001vl1zt0v4u18xn' },
        include: {
            sdItem: {
                include: {
                    delivery: true
                }
            }
        }
    });
    
    for (const alloc of allocs) {
        console.log(`Allocated ${alloc.qty} to SD ${alloc.sdItem.delivery?.deliveryNumber}`);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
