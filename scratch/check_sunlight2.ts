import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Search without uom filter
    const products = await prisma.product.findMany({
        where: { name: { contains: 'Sunlight 610', mode: 'insensitive' } },
        select: { id: true, name: true, sku: true, uom: true }
    });
    
    console.log('Products found:', products.length);
    for (const p of products) {
        console.log(`  ${p.id} | ${p.name} | SKU: ${p.sku} | UOM: ${p.uom}`);
    }
    
    if (products.length === 0) return;
    const productId = products[0].id;
    
    const lots = await prisma.productLot.findMany({
        where: { productId, isVoided: false },
        orderBy: { grDate: 'asc' }
    });
    
    console.log(`\n=== ALL LOTS (${lots.length}) ===`);
    for (const l of lots) {
        const flag = l.remainingQty > 0 ? '⚠️ MASIH ADA' : '✅ HABIS';
        console.log(`${flag}  ${l.grNumber} | ${l.grDate?.toISOString().slice(0,10)} | init: ${l.initialQty} | rem: ${l.remainingQty} | ${l.supplierName}`);
    }
    
    // June 29 sales with allocations
    console.log('\n=== JUNE 29 SALES + LOT ALLOCATION ===');
    const june29Sales = await prisma.salesDelivery.findMany({
        where: {
            date: { gte: new Date('2026-06-29T00:00:00+07:00'), lt: new Date('2026-06-30T00:00:00+07:00') },
            isVoid: false,
            items: { some: { productId } }
        },
        include: {
            items: {
                where: { productId },
                include: {
                    lotAllocations: {
                        include: { lot: { select: { lotNumber: true, grNumber: true, grDate: true } } }
                    }
                }
            }
        }
    });
    
    for (const sd of june29Sales) {
        console.log(`\n${sd.deliveryNumber} | ${sd.buyerName}`);
        for (const item of sd.items) {
            console.log(`  qty: ${item.quantity} | allocs: ${item.lotAllocations.length}`);
            for (const alloc of item.lotAllocations) {
                console.log(`  -> GR: ${alloc.lot?.grNumber} | grDate: ${alloc.lot?.grDate?.toISOString().slice(0,10)} | qty: ${alloc.qty}`);
            }
        }
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
