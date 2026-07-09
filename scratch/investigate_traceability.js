const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const delivery = await prisma.salesDelivery.findFirst({
        where: { invoiceNumber: 'KB-TRD-08072026-002' },
        include: {
            items: {
                include: {
                    product: true,
                    lotAllocations: {
                        include: {
                            lot: {
                                include: {
                                    grItem: {
                                        include: {
                                            receipt: true
                                        }
                                    }
                                }
                            }
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

    delivery.items.forEach(item => {
        console.log(`\nProduct: ${item.product.name}`);
        item.lotAllocations.forEach(alloc => {
            const lot = alloc.lot;
            const receipt = lot.grItem?.receipt;
            if (receipt) {
                console.log(`  - Took ${alloc.qty} from Purchase Receipt: ${receipt.receiptNumber} (Supplier: ${receipt.supplierName || 'N/A'}, Date: ${receipt.createdAt})`);
            } else {
                console.log(`  - Took ${alloc.qty} from Lot: ${lot.id} (No Receipt tied, likely opening balance)`);
            }
        });
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
