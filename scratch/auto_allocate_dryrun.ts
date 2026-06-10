import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    console.log("=== DRY RUN: AUTO ALLOCATE UNALLOCATED ITEMS ===");

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

    console.log(`Found ${unallocated.length} unallocated items.`);

    // Map to keep track of remaining quantities during dry-run
    const lotRemainingQty = new Map<string, number>();

    let matchCount = 0;
    let totalQtyAllocated = 0;

    for (const item of unallocated) {
        let remaining = item.quantity;
        
        // Find available lots for this product in the same warehouse
        const availableLots = await prisma.productLot.findMany({
            where: {
                productId: item.productId,
                isVoided: false,
                grDate: { lte: item.delivery.date } // Must be purchased BEFORE or ON the sale date
            },
            orderBy: { grDate: 'asc' }
        });

        const matchedAllocations = [];

        for (const lot of availableLots) {
            if (remaining <= 0) break;

            // Get current remaining qty from our local map or database
            let remQty = lotRemainingQty.has(lot.id) 
                ? lotRemainingQty.get(lot.id)! 
                : lot.remainingQty;

            if (remQty > 0) {
                const consume = Math.min(remaining, remQty);
                lotRemainingQty.set(lot.id, remQty - consume);
                remaining -= consume;
                matchedAllocations.push({
                    lotNumber: lot.lotNumber,
                    grNumber: lot.grNumber,
                    supplierName: lot.supplierName,
                    qty: consume,
                    price: lot.purchasePrice
                });
            }
        }

        if (matchedAllocations.length > 0) {
            matchCount++;
            totalQtyAllocated += (item.quantity - remaining);
            if (item.product.name.includes("Kecap Bango")) {
                console.log(`\nMATCHED: SD: ${item.delivery.deliveryNumber} | Date: ${item.delivery.date.toISOString()} | Product: ${item.product.name} | Qty: ${item.quantity} | Buyer: ${item.delivery.buyerName || item.delivery.recipient}`);
                for (const a of matchedAllocations) {
                    console.log(`  -> Allocate ${a.qty} from Lot: ${a.lotNumber} (GR: ${a.grNumber}, Supplier: ${a.supplierName}, Price: ${a.price})`);
                }
                if (remaining > 0) {
                    console.log(`  -> REMAINING UNALLOCATED: ${remaining}`);
                }
            }
        }
    }

    console.log(`\nSummary: Simulated matching for ${matchCount} out of ${unallocated.length} items. Total Qty Allocated: ${totalQtyAllocated}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
