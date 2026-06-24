const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixHpp() {
    console.log("Starting HPP / Landed Cost fix migration...");
    
    // 1. Fetch all goods receipts that have items
    const receipts = await prisma.goodsReceipt.findMany({
        include: {
            items: true
        }
    });

    console.log(`Found ${receipts.length} Goods Receipts.`);

    let lotsUpdated = 0;
    let allocationsUpdated = 0;

    for (const receipt of receipts) {
        // Calculate totals similar to createGoodsReceipt
        let grossAmount = 0;
        let totalItemDiscounts = 0;
        receipt.items.forEach((i) => {
            const lineGross = (Number(i.quantity) || 0) * (Number(i.purchasePrice) || 0);
            const lineDiscount = Number(i.discount) || 0;
            grossAmount += lineGross;
            totalItemDiscounts += lineDiscount;
        });

        const subtotal = Math.round(grossAmount - totalItemDiscounts);
        const totalDiscountNominal = Math.round(Number(receipt.totalDiscount) || 0);
        
        let cbPct = 0;
        if (receipt.cashbacks && Array.isArray(receipt.cashbacks)) {
            cbPct = receipt.cashbacks.reduce((sum, cb) => sum + (Number(cb.rate) || 0), 0);
        }

        // 2. Process each item and its corresponding lot
        for (const grItem of receipt.items) {
            const rawTotal = (Number(grItem.quantity) || 0) * (Number(grItem.purchasePrice) || 0);
            const netAfterItemDiscount = rawTotal - (Number(grItem.discount) || 0);
            const propDiscount = subtotal > 0 ? (netAfterItemDiscount / subtotal) * totalDiscountNominal : 0;
            const netAfterGlobalDiscount = netAfterItemDiscount - propDiscount;
            const netAfterCb = netAfterGlobalDiscount * (1 - (cbPct / 100));
            const landedCost = (Number(grItem.quantity) || 0) > 0 ? netAfterCb / Number(grItem.quantity) : Number(grItem.purchasePrice);

            // Update the ProductLot associated with this grItem
            const lot = await prisma.productLot.findUnique({
                where: { grItemId: grItem.id }
            });

            if (lot) {
                // Only update if landedCost changed or was null
                const currentLandedCost = Number(lot.landedCost) || null;
                const newLandedCost = Number(landedCost);
                
                // Always update just to be safe, or check if different
                if (currentLandedCost !== newLandedCost) {
                    await prisma.productLot.update({
                        where: { id: lot.id },
                        data: { landedCost: newLandedCost }
                    });
                    lotsUpdated++;

                    // Update any allocations from this lot
                    const updateResult = await prisma.lotAllocation.updateMany({
                        where: { lotId: lot.id },
                        data: { hppAtTime: newLandedCost }
                    });
                    allocationsUpdated += updateResult.count;
                }
            }
        }
    }

    console.log(`Migration Complete!`);
    console.log(`Lots updated: ${lotsUpdated}`);
    console.log(`LotAllocations updated: ${allocationsUpdated}`);
}

fixHpp()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
