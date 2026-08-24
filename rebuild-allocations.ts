import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("Starting Rebuild Allocations...");
    
    // 1. Delete ALL existing LotAllocations
    const deletedAllocations = await prisma.lotAllocation.deleteMany({});
    console.log(`Deleted ${deletedAllocations.count} existing allocations.`);

    // 2. Reset ALL ProductLot remainingQty to initialQty
    const lots = await prisma.productLot.findMany();
    let resetCount = 0;
    for (const lot of lots) {
        if (lot.remainingQty !== lot.initialQty) {
            await prisma.productLot.update({
                where: { id: lot.id },
                data: { remainingQty: lot.initialQty }
            });
            resetCount++;
        }
    }
    console.log(`Reset remainingQty for ${resetCount} lots.`);

    // 3. Fetch ALL SalesDeliveryItems, sorted by delivery.date asc, id asc
    const salesItems = await prisma.salesDeliveryItem.findMany({
        where: { delivery: { isVoid: false } },
        include: { delivery: true, product: true },
        orderBy: [
            { delivery: { date: 'asc' } },
            { id: 'asc' }
        ]
    });
    console.log(`Found ${salesItems.length} SalesDeliveryItems to reallocate.`);

    // 4. Re-allocate FIFO
    let allocatedItemsCount = 0;
    let totalAllocationsCreated = 0;

    for (const sdItem of salesItems) {
        let remaining = sdItem.quantity;
        
        while (remaining > 0) {
            const lot = await prisma.productLot.findFirst({
                where: {
                    productId: sdItem.productId,
                    isVoided: false,
                    remainingQty: { gt: 0 }
                },
                orderBy: { grDate: 'asc' }
            });

            if (!lot) {
                // No more lots available
                break;
            }

            const consume = Math.min(remaining, lot.remainingQty);
            await prisma.lotAllocation.create({
                data: {
                    lotId: lot.id,
                    sdItemId: sdItem.id,
                    qty: consume,
                    hppAtTime: lot.landedCost || lot.purchasePrice
                }
            });

            await prisma.productLot.update({
                where: { id: lot.id },
                data: { remainingQty: { decrement: consume } }
            });

            remaining -= consume;
            totalAllocationsCreated++;
        }

        if (remaining < sdItem.quantity) {
            allocatedItemsCount++;
        }
    }

    console.log(`Successfully reallocated ${allocatedItemsCount} items. Created ${totalAllocationsCreated} LotAllocations.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
