import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    console.log("=== EXECUTING AUTO ALLOCATION FOR UNALLOCATED ITEMS ===");

    // Get all unallocated sales delivery items
    const unallocated = await prisma.salesDeliveryItem.findMany({
        where: {
            lotAllocations: { none: {} },
            delivery: { isVoid: false }
        },
        include: {
            delivery: true,
            product: true
        },
        orderBy: {
            delivery: { date: 'asc' }
        }
    });

    console.log(`Found ${unallocated.length} unallocated items to process.`);

    let allocatedCount = 0;

    for (const item of unallocated) {
        let remaining = item.quantity;
        
        // Find available lots for this product where grDate <= delivery.date
        const availableLots = await prisma.productLot.findMany({
            where: {
                productId: item.productId,
                isVoided: false,
                grDate: { lte: item.delivery.date }, // Must be purchased before or on the sale date
                remainingQty: { gt: 0 }
            },
            orderBy: { grDate: 'asc' }
        });

        if (availableLots.length === 0) {
            continue;
        }

        // We run updates in a transaction per item to ensure consistency
        await prisma.$transaction(async (tx) => {
            for (const lot of availableLots) {
                if (remaining <= 0) break;

                // Re-fetch the lot within transaction to get up-to-date remainingQty
                const currentLot = await tx.productLot.findUnique({
                    where: { id: lot.id }
                });

                if (!currentLot || currentLot.remainingQty <= 0 || currentLot.isVoided) {
                    continue;
                }

                const consume = Math.min(remaining, currentLot.remainingQty);

                // 1. Create LotAllocation
                await tx.lotAllocation.create({
                    data: {
                        lotId: currentLot.id,
                        sdItemId: item.id,
                        qty: consume,
                        hppAtTime: currentLot.landedCost ?? currentLot.purchasePrice
                    }
                });

                // 2. Decrement remainingQty on the lot
                await tx.productLot.update({
                    where: { id: currentLot.id },
                    data: { remainingQty: { decrement: consume } }
                });

                remaining -= consume;
            }
        });

        allocatedCount++;
    }

    console.log(`Successfully processed and allocated lots for ${allocatedCount} items.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
