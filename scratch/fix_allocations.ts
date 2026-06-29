import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // 1. Find the 1 Inti Cakrawala allocation in SJ-182
    const allocSJ182 = await prisma.lotAllocation.findUnique({
        where: { id: 'cmqaz99v004pjhzkfx4nwshng' } // From earlier logs
    });
    
    // 2. Find the 1 Jenindo allocation in SJ-729
    const allocSJ729 = await prisma.lotAllocation.findUnique({
        where: { id: 'cmqaz9bng04rfhzkf8j2mnrnd' } // From earlier logs
    });
    
    if (allocSJ182 && allocSJ729) {
        console.log("Swapping lots...");
        // Swap lotIds and hppAtTime
        await prisma.lotAllocation.update({
            where: { id: allocSJ182.id },
            data: {
                lotId: allocSJ729.lotId,
                hppAtTime: allocSJ729.hppAtTime
            }
        });
        
        await prisma.lotAllocation.update({
            where: { id: allocSJ729.id },
            data: {
                lotId: allocSJ182.lotId,
                hppAtTime: allocSJ182.hppAtTime
            }
        });
        
        console.log("Swap completed successfully!");
    } else {
        console.log("Allocations not found!");
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
