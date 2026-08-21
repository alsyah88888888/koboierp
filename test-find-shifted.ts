import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // Find any goods receipt (ProductLot) with a time of 17:00:00Z
    const lots = await prisma.productLot.findMany({
        where: {
            grDate: {
                gte: new Date('2026-07-30T00:00:00Z'),
                lte: new Date('2026-08-05T00:00:00Z')
            }
        },
        select: { id: true, grNumber: true, grDate: true }
    });
    console.log(lots.filter(l => l.grDate && l.grDate.toISOString().includes('17:00:00')));
}
main();
