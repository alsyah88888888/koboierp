import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Find all Sunlight 610ml lots and their remaining qty
    const product = await prisma.product.findFirst({
        where: { name: { contains: 'Sunlight', mode: 'insensitive' }, uom: { contains: 'KARTON' } },
        select: { id: true, name: true, sku: true }
    });
    
    if (!product) { console.log('Product not found'); return; }
    console.log(`Product: ${product.name} | ID: ${product.id}`);
    
    const lots = await prisma.productLot.findMany({
        where: { productId: product.id, isVoided: false },
        orderBy: { grDate: 'asc' }
    });
    
    console.log(`\n=== ALL LOTS (${lots.length}) ===`);
    let totalRemaining = 0;
    for (const l of lots) {
        const prefix = l.remainingQty > 0 ? '⚠️' : '✅';
        console.log(`${prefix} ${l.lotNumber}`);
        console.log(`   GR: ${l.grNumber} | grDate: ${l.grDate?.toISOString().slice(0, 10)}`);
        console.log(`   initial: ${l.initialQty} | remaining: ${l.remainingQty} | supplier: ${l.supplierName}`);
        totalRemaining += l.remainingQty;
    }
    console.log(`\nTotal remaining across all lots: ${totalRemaining}`);
    
    // Check June 29 purchases specifically
    console.log('\n=== JUNE 29 PURCHASES ===');
    const june29GR = await prisma.goodsReceipt.findMany({
        where: {
            date: { gte: new Date('2026-06-29'), lt: new Date('2026-06-30') },
            isVoid: false,
            items: { some: { productId: product.id } }
        },
        include: {
            items: { where: { productId: product.id } }
        }
    });
    for (const gr of june29GR) {
        console.log(`GR: ${gr.receiptNumber} | from: ${gr.receivedFrom}`);
        for (const item of gr.items) {
            console.log(`   qty: ${item.quantity} | price: ${item.purchasePrice}`);
        }
    }
    
    // Check June 29 sales 
    console.log('\n=== JUNE 29 SALES ===');
    const june29Sales = await prisma.salesDelivery.findMany({
        where: {
            date: { gte: new Date('2026-06-29'), lt: new Date('2026-06-30') },
            isVoid: false,
            items: { some: { productId: product.id } }
        },
        include: {
            items: {
                where: { productId: product.id },
                include: {
                    lotAllocations: {
                        include: { lot: { select: { lotNumber: true, grNumber: true, grDate: true } } }
                    }
                }
            }
        }
    });
    for (const sd of june29Sales) {
        console.log(`\nSD: ${sd.deliveryNumber} | buyer: ${sd.buyerName}`);
        for (const item of sd.items) {
            console.log(`   qty sold: ${item.quantity}`);
            for (const alloc of item.lotAllocations) {
                console.log(`   -> Lot: ${alloc.lot?.lotNumber} | GR: ${alloc.lot?.grNumber} | grDate: ${alloc.lot?.grDate?.toISOString().slice(0,10)} | qty: ${alloc.qty}`);
            }
        }
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
