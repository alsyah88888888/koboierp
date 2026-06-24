const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    // Delivery might not exist exactly as 'KB-TRN-18062026-002' but maybe as invoiceNumber or deliveryNumber
    const delivery = await prisma.salesDelivery.findFirst({
        where: { 
            OR: [
                { deliveryNumber: 'KB-TRN-18062026-002' },
                { invoiceNumber: 'KB-TRN-18062026-002' }
            ]
        },
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
        console.log("Delivery not found");
        return;
    }

    console.log(`Delivery: ${delivery.deliveryNumber}, Invoice: ${delivery.invoiceNumber}`);
    for (const item of delivery.items) {
        console.log(`- Item: ${item.product.name} (Qty: ${item.quantity})`);
        console.log(`  VendorName in SD Item: ${item.vendorName}`);
        for (const alloc of item.lotAllocations) {
            console.log(`  * Lot Allocation: Qty ${alloc.qty}`);
            console.log(`    Lot: ${alloc.lot.lotNumber}, Supplier: ${alloc.lot.supplierName}, GR: ${alloc.lot.grNumber}`);
        }
        if (item.lotAllocations.length === 0) {
            console.log(`  * NO LOT ALLOCATIONS!`);
        }
    }
}

check().catch(console.error).finally(() => prisma.$disconnect());
