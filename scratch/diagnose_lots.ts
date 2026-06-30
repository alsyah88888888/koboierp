import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseDeeper() {
    console.log("=== DEEPER DIAGNOSTIC: SD Items without LotAllocation ===\n");

    // 1. How many are from voided deliveries?
    const voidedNoAlloc = await prisma.salesDeliveryItem.count({
        where: { lotAllocations: { none: {} }, delivery: { isVoid: true } }
    });
    const activeNoAlloc = await prisma.salesDeliveryItem.count({
        where: { lotAllocations: { none: {} }, delivery: { isVoid: false } }
    });
    console.log(`Total without allocation: ${voidedNoAlloc + activeNoAlloc}`);
    console.log(`  - From VOIDED deliveries: ${voidedNoAlloc} (can skip)`);
    console.log(`  - From ACTIVE deliveries: ${activeNoAlloc} (NEED migration)\n`);

    // 2. Breakdown by month
    const unallocated = await prisma.salesDeliveryItem.findMany({
        where: { lotAllocations: { none: {} }, delivery: { isVoid: false } },
        include: { 
            delivery: { select: { deliveryNumber: true, date: true, buyerName: true, warehouseId: true } },
            product: { select: { name: true, sku: true } }
        },
        orderBy: { delivery: { date: 'asc' } }
    });

    // Group by month
    const byMonth = new Map<string, number>();
    for (const item of unallocated) {
        const d = item.delivery.date;
        const key = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : 'unknown';
        byMonth.set(key, (byMonth.get(key) || 0) + 1);
    }
    console.log("📅 Breakdown by month:");
    for (const [month, count] of Array.from(byMonth.entries()).sort()) {
        console.log(`   ${month}: ${count} items`);
    }

    // 3. Check if the products in these SD items have ProductLots available
    const productIds = [...new Set(unallocated.map(u => u.productId))];
    console.log(`\n🔍 Unique products needing allocation: ${productIds.length}`);

    // Check how many of those products have lots
    const productsWithLots = await prisma.productLot.groupBy({
        by: ['productId'],
        where: { productId: { in: productIds }, isVoided: false },
        _sum: { initialQty: true, remainingQty: true }
    });

    const lotMap = new Map(productsWithLots.map(p => [p.productId, p]));
    let withLots = 0, withoutLots = 0;
    for (const pid of productIds) {
        if (lotMap.has(pid)) withLots++; else withoutLots++;
    }
    console.log(`   Products that HAVE lots: ${withLots}`);
    console.log(`   Products that have NO lots at all: ${withoutLots}`);

    // 4. Show first 10 unallocated active items
    console.log(`\n📋 Sample unallocated active items (first 15):`);
    for (const item of unallocated.slice(0, 15)) {
        const hasLot = lotMap.has(item.productId);
        console.log(`   ${item.delivery.deliveryNumber} | ${item.delivery.date?.toISOString().split('T')[0]} | ${item.product.name.substring(0, 30)} | qty=${item.quantity} | lots=${hasLot ? '✅' : '❌'}`);
    }

    // 5. Show last 10 
    console.log(`\n📋 Sample unallocated active items (last 15):`);
    for (const item of unallocated.slice(-15)) {
        const hasLot = lotMap.has(item.productId);
        console.log(`   ${item.delivery.deliveryNumber} | ${item.delivery.date?.toISOString().split('T')[0]} | ${item.product.name.substring(0, 30)} | qty=${item.quantity} | lots=${hasLot ? '✅' : '❌'}`);
    }
}

diagnoseDeeper()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
