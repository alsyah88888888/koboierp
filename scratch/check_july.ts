const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCrossSales() {
    const allocations = await prisma.lotAllocation.findMany({
        where: {
            sdItem: {
                delivery: {
                    date: { gte: new Date('2026-07-01'), lte: new Date('2026-07-31') },
                    isVoid: false
                }
            }
        },
        include: {
            sdItem: { include: { delivery: true, product: true } },
            lot: { include: { grItem: { include: { receipt: true } } } }
        }
    });
    
    let pfToBc = 0;
    let bcToPf = 0;
    for (const alloc of allocations) {
        if (!alloc.sdItem || !alloc.lot || !alloc.lot.grItem || !alloc.lot.grItem.receipt) continue;
        const seller = alloc.sdItem.delivery.salesPerson;
        const buyer = alloc.lot.grItem.receipt.salesPerson;
        if (seller === 'BC' && buyer === 'PF') pfToBc++;
        if (seller === 'PF' && buyer === 'BC') bcToPf++;
    }
    console.log(`PF to BC: ${pfToBc}, BC to PF: ${bcToPf}`);
}
checkCrossSales().finally(() => prisma.$disconnect());
