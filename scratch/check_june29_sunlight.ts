import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const sj = await prisma.salesDelivery.findUnique({
        where: { deliveryNumber: 'SJ-114-29062026-007' },
        include: {
            items: {
                include: {
                    product: { select: { name: true, sku: true } },
                    lotAllocations: {
                        include: { lot: {
                            include: { grItem: { include: { receipt: true } } }
                        }}
                    }
                }
            }
        }
    });
    
    if (!sj) {
        console.log('Delivery not found');
        return;
    }
    
    console.log(`\n${sj.deliveryNumber} | date: ${sj.date} | taxRate: ${sj.taxRate}`);
    for (const item of sj.items) {
        console.log(`\nProduct: ${item.product?.name} | qty: ${item.quantity} | lotAllocations: ${item.lotAllocations.length}`);
        if (item.lotAllocations.length === 0) {
            console.log('  ⚠️  NO LOT ALLOCATIONS - will use predictive fallback!');
        }
        for (const alloc of item.lotAllocations) {
            const lot = alloc.lot;
            const gr = lot?.grItem?.receipt;
            console.log(`  Lot: ${lot?.lotNumber}`);
            console.log(`  GR: ${lot?.grNumber} | grDate: ${lot?.grDate} | supplierName: ${lot?.supplierName}`);
            console.log(`  GR receipt date: ${gr?.date} | taxRate: ${gr?.taxRate}`);
            console.log(`  alloc.qty: ${alloc.qty} | hppAtTime: ${alloc.hppAtTime}`);
        }
    }
    
    // Also check Sunlight stock
    const sunlightProduct = await prisma.product.findFirst({
        where: { name: { contains: 'Sunlight', mode: 'insensitive' }, sku: { contains: '610' } }
    });
    
    if (sunlightProduct) {
        console.log(`\n=== Sunlight ProductId: ${sunlightProduct.id} ===`);
        const lots = await prisma.productLot.findMany({
            where: { productId: sunlightProduct.id },
            orderBy: { grDate: 'asc' },
            select: { lotNumber: true, grNumber: true, grDate: true, initialQty: true, remainingQty: true, supplierName: true }
        });
        for (const l of lots) {
            console.log(`  ${l.lotNumber} | GR: ${l.grNumber} | grDate: ${l.grDate} | initial: ${l.initialQty} | remaining: ${l.remainingQty} | supplier: ${l.supplierName}`);
        }
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
