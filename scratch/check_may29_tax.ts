import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Check sales on May 29
    const salesMay29 = await prisma.salesDelivery.findMany({
        where: { date: { gte: new Date('2026-05-29'), lt: new Date('2026-05-30') }, isVoid: false },
        include: {
            items: {
                include: {
                    lotAllocations: { include: { lot: true } }
                }
            }
        }
    });
    
    console.log(`=== Sales on May 29: ${salesMay29.length} docs ===`);
    for (const sd of salesMay29) {
        console.log(`\n  ${sd.deliveryNumber} | taxRate: ${sd.taxRate} | invoiceNumber: ${sd.invoiceNumber}`);
        for (const item of sd.items) {
            console.log(`    Item: ${item.productId} | qty: ${item.quantity} | price: ${item.salesPrice}`);
            for (const alloc of item.lotAllocations) {
                const lot = alloc.lot;
                console.log(`    Lot: ${lot?.lotNumber} | grNumber: ${lot?.grNumber} | hppAtTime: ${alloc.hppAtTime}`);
                
                // Now check the GR for this lot's taxRate
                if (lot?.grNumber) {
                    const gr = await prisma.goodsReceipt.findUnique({
                        where: { receiptNumber: lot.grNumber },
                        select: { receiptNumber: true, taxRate: true, date: true }
                    });
                    console.log(`    GR: ${gr?.receiptNumber} | taxRate: ${gr?.taxRate} | date: ${gr?.date}`);
                }
            }
        }
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
