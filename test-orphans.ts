import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const allocations = await prisma.lotAllocation.findMany({
        where: {
            lot: { isVoided: true }
        },
        include: {
            lot: true
        }
    });
    console.log(`Found ${allocations.length} orphaned allocations.`);
    if (allocations.length > 0) {
        console.log(allocations[0]);
    }
}
main();
