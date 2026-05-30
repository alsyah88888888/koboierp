const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("=== CHECKING DELIVERY KB-TRD-05052026-005 ===");
    const delivery = await prisma.salesDelivery.findUnique({
        where: { deliveryNumber: "KB-TRD-05052026-005" },
        include: {
            items: {
                include: {
                    product: true,
                    lotAllocations: {
                        include: {
                            lot: true
                        }
                    }
                }
            }
        }
    });

    if (!delivery) {
        console.error("Delivery not found!");
        return;
    }

    console.log(`Delivery ID: ${delivery.id}`);
    console.log(`Date: ${delivery.date.toISOString()} (Local/WIB: ${new Date(delivery.date).toLocaleString('id-ID')})`);
    
    for (const item of delivery.items) {
        console.log(`\nItem: ${item.product.name} (SKU: ${item.product.sku})`);
        console.log(`Quantity: ${item.quantity}`);
        console.log(`Lot Allocations in DB:`);
        for (const alloc of item.lotAllocations) {
            console.log(`  - Lot ID: ${alloc.lot.id}`);
            console.log(`    Lot Number: ${alloc.lot.lotNumber}`);
            console.log(`    grNumber: ${alloc.lot.grNumber}`);
            console.log(`    grDate: ${alloc.lot.grDate.toISOString()} (${new Date(alloc.lot.grDate).toLocaleString('id-ID')})`);
            console.log(`    purchasePrice: ${alloc.lot.purchasePrice}`);
            console.log(`    remainingQty: ${alloc.lot.remainingQty}`);
        }

        console.log(`All Available Product Lots for this product in DB:`);
        const lots = await prisma.productLot.findMany({
            where: { productId: item.product.id, isVoided: false },
            orderBy: { grDate: 'asc' }
        });
        for (const lot of lots) {
            console.log(`  * Lot Number: ${lot.lotNumber}`);
            console.log(`    grNumber: ${lot.grNumber}`);
            console.log(`    grDate: ${lot.grDate.toISOString()} (${new Date(lot.grDate).toLocaleString('id-ID')})`);
            console.log(`    purchasePrice: ${lot.purchasePrice}`);
            console.log(`    remainingQty: ${lot.remainingQty}`);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
