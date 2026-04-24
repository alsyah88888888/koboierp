/**
 * BACKFILL SCRIPT: Generate ProductLot for existing GoodsReceiptItems
 * 
 * Run ONCE only: node prisma/backfill_lots.js
 * 
 * - Creates ProductLot for every existing GoodsReceiptItem that doesn't have one yet
 * - remainingQty is set to initialQty (FIFO accuracy for historical data is best-effort)
 * - Does NOT attempt to create LotAllocations for old sales (too complex, not reliable)
 * - Old sales will appear as "DATA HISTORIS (PRE-LOT)" in traceability report
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function backfillLots() {
    console.log('🚀 Starting ProductLot backfill...');

    // Get all GoodsReceiptItems that don't have a lot yet
    const grItems = await prisma.goodsReceiptItem.findMany({
        where: { lot: null },
        include: {
            product: { select: { sku: true } },
            receipt: { select: { receiptNumber: true, receivedFrom: true, date: true, isVoid: true } }
        },
        orderBy: { receipt: { date: 'asc' } }
    });

    console.log(`📦 Found ${grItems.length} GoodsReceiptItems without lots.`);
    let created = 0;
    let skipped = 0;

    for (const item of grItems) {
        try {
            // Skip voided receipts — don't create lots for them
            if (item.receipt.isVoid) {
                skipped++;
                continue;
            }

            const sku = item.product.sku.replace(/[^A-Z0-9]/gi, '').toUpperCase();
            const grDate = item.receipt.date || new Date();
            const grDateStr = grDate.toISOString().slice(0, 10).replace(/-/g, '');
            const prefix = `LOT-HIST-${sku}-${grDateStr}-`;

            // Find next sequence number for this prefix
            const latestLot = await prisma.productLot.findFirst({
                where: { lotNumber: { startsWith: prefix } },
                orderBy: { lotNumber: 'desc' }
            });
            let lotSeq = 1;
            if (latestLot) {
                const parts = latestLot.lotNumber.split('-');
                const lastNum = parseInt(parts[parts.length - 1]);
                if (!isNaN(lastNum)) lotSeq = lastNum + 1;
            }
            const lotNumber = `${prefix}${String(lotSeq).padStart(3, '0')}`;

            await prisma.productLot.create({
                data: {
                    lotNumber,
                    productId: item.productId,
                    grItemId: item.id,
                    supplierName: item.receipt.receivedFrom || 'UMUM',
                    purchasePrice: item.purchasePrice,
                    grNumber: item.receipt.receiptNumber,
                    grDate: grDate,
                    initialQty: item.quantity,
                    // remainingQty = initialQty for historical data
                    // (actual remaining stock tracked via Stock table, not here)
                    remainingQty: item.quantity
                }
            });

            created++;
            if (created % 10 === 0) {
                console.log(`  ✅ Created ${created} lots so far...`);
            }
        } catch (err) {
            console.error(`  ❌ Error creating lot for GRItem ${item.id}:`, err.message);
        }
    }

    console.log(`\n✅ Backfill complete!`);
    console.log(`  Created: ${created} lots`);
    console.log(`  Skipped (voided): ${skipped} items`);
    console.log(`\n⚠️  NOTE: Historical lots have remainingQty = initialQty.`);
    console.log(`  Future transactions (from today) will have accurate remainingQty.`);
}

backfillLots()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
