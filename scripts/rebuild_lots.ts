import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function rebuild() {
    console.log("🚀 Starting Traceability Lot Allocation Rebuild...");

    // 1. Delete all existing Lot Allocations
    console.log("1. Deleting all existing LotAllocations...");
    const deletedAllocs = await prisma.lotAllocation.deleteMany({});
    console.log(`✅ Deleted ${deletedAllocs.count} LotAllocations.`);

    // 2. Reset ProductLot remainingQty to initialQty
    console.log("2. Resetting ProductLot remainingQty to initialQty...");
    const lots = await prisma.productLot.findMany();
    let updatedLots = 0;
    for (const lot of lots) {
        await prisma.productLot.update({
            where: { id: lot.id },
            data: { remainingQty: lot.initialQty }
        });
        updatedLots++;
    }
    console.log(`✅ Reset remainingQty for ${updatedLots} ProductLots.`);

    // 3. Apply Purchase Returns (reduce lot remainingQty)
    console.log("3. Processing Purchase Returns...");
    const purchaseReturns = await prisma.purchaseReturnItem.findMany({
        where: { purchaseReturn: { isVoid: false } },
        include: { purchaseReturn: { include: { receipt: true } } },
        orderBy: { purchaseReturn: { date: 'asc' } }
    });

    let processedPR = 0;
    for (const pr of purchaseReturns) {
        const activeLot = await prisma.productLot.findFirst({
            where: {
                productId: pr.productId,
                grNumber: pr.purchaseReturn.receipt.receiptNumber,
                isVoided: false
            },
            orderBy: { grDate: 'asc' }
        });
        if (activeLot) {
            await prisma.productLot.update({
                where: { id: activeLot.id },
                data: { remainingQty: Math.max(0, activeLot.remainingQty - pr.quantity) }
            });
            processedPR++;
        }
    }
    console.log(`✅ Processed ${processedPR} Purchase Return Items.`);

    // 4. Replay Sales Deliveries (consume lots)
    console.log("4. Replaying Sales Deliveries for FIFO Lot Allocation...");
    const salesDeliveries = await prisma.salesDelivery.findMany({
        where: { isVoid: false },
        include: { items: true },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }]
    });

    let processedSalesItems = 0;
    let newAllocations = 0;
    for (const sd of salesDeliveries) {
        for (const item of sd.items) {
            let remaining = item.quantity;
            
            // STRICT FILTERING: Match productId, vendorName (supplier), and warehouse
            const availableLots = await prisma.productLot.findMany({
                where: {
                    productId: item.productId,
                    remainingQty: { gt: 0 },
                    isVoided: false,
                    grItem: {
                        receipt: {
                            warehouseId: sd.warehouseId
                        }
                    }
                },
                orderBy: { grDate: 'asc' }
            });

            for (const lot of availableLots) {
                if (remaining <= 0) break;
                const consume = Math.min(remaining, lot.remainingQty);
                
                await prisma.lotAllocation.create({
                    data: {
                        lotId: lot.id,
                        sdItemId: item.id,
                        qty: consume,
                        hppAtTime: lot.purchasePrice
                    }
                });
                newAllocations++;

                await prisma.productLot.update({
                    where: { id: lot.id },
                    data: { remainingQty: { decrement: consume } }
                });

                remaining -= consume;
            }
            processedSalesItems++;
        }
    }
    console.log(`✅ Replayed ${processedSalesItems} Sales Delivery Items. Created ${newAllocations} LotAllocations.`);

    // 5. Replay Sales Returns (restore lots)
    console.log("5. Processing Sales Returns...");
    const salesReturns = await prisma.salesReturnItem.findMany({
        where: { salesReturn: { isVoid: false } },
        include: { salesReturn: { include: { delivery: true } } },
        orderBy: { salesReturn: { date: 'asc' } }
    });

    let processedSR = 0;
    for (const sr of salesReturns) {
        if (sr.deliveryItemId) {
            const allocations = await prisma.lotAllocation.findMany({
                where: { sdItemId: sr.deliveryItemId },
                orderBy: { createdAt: 'desc' } // LIFO restore
            });
            let returnRemaining = sr.quantity;
            for (const alloc of allocations) {
                if (returnRemaining <= 0) break;
                const restoreQty = Math.min(returnRemaining, alloc.qty);
                await prisma.productLot.update({
                    where: { id: alloc.lotId },
                    data: { remainingQty: { increment: restoreQty } }
                });
                returnRemaining -= restoreQty;
            }
            processedSR++;
        }
    }
    console.log(`✅ Processed ${processedSR} Sales Return Items.`);

    console.log("\n✅ TRACEABILITY LOT REBUILD COMPLETE!");
}

rebuild()
    .catch((e) => {
        console.error("❌ ERROR DURING REBUILD:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
