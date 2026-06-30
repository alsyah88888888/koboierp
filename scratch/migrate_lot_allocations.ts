/**
 * RETROACTIVE LOT ALLOCATION MIGRATION
 * =====================================
 * This script creates LotAllocation records for all SalesDeliveryItems
 * that don't have them yet. It uses FIFO order (oldest lot first) based
 * on the GR date, matching by productId and warehouseId.
 * 
 * Strategy:
 * 1. Temporarily "reset" remainingQty on all ProductLots to initialQty
 * 2. Process ALL SalesDeliveryItems (both allocated and unallocated) in 
 *    chronological order to ensure consistent FIFO allocation
 * 3. This guarantees the lot allocations are accurate and deterministic
 * 
 * Safety:
 * - Runs in a single transaction (all-or-nothing)
 * - Skips voided deliveries
 * - Handles edge cases (negative remaining, etc.)
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
    console.log("=== RETROACTIVE LOT ALLOCATION MIGRATION ===\n");
    console.log("⚠️  This will reset and re-allocate ALL lot allocations using FIFO.\n");

    // Phase 1: Collect all data
    console.log("📥 Phase 1: Loading data...");
    
    // Get all non-voided ProductLots ordered by date (FIFO)
    const allLots = await prisma.productLot.findMany({
        where: { isVoided: false },
        include: {
            grItem: {
                include: {
                    receipt: { select: { warehouseId: true, isVoid: true } }
                }
            }
        },
        orderBy: { grDate: 'asc' }
    });

    // Filter out lots from voided receipts
    const validLots = allLots.filter(l => !l.grItem.receipt.isVoid);
    console.log(`   Found ${validLots.length} valid ProductLots`);

    // Get all non-voided SalesDeliveryItems in chronological order
    const allSDItems = await prisma.salesDeliveryItem.findMany({
        where: { delivery: { isVoid: false } },
        include: {
            delivery: { select: { date: true, warehouseId: true, deliveryNumber: true } },
            product: { select: { name: true } }
        },
        orderBy: { delivery: { date: 'asc' } }
    });
    console.log(`   Found ${allSDItems.length} active SalesDeliveryItems\n`);

    // Phase 2: Build in-memory lot pool (FIFO)
    console.log("🧮 Phase 2: Building lot pool and simulating FIFO allocation...");
    
    // Build lot pool: Map<productId-warehouseId, lots[]>
    type LotEntry = {
        lotId: string;
        remaining: number;
        purchasePrice: number;
        landedCost: number | null;
    };
    
    const lotPool = new Map<string, LotEntry[]>();
    for (const lot of validLots) {
        const key = `${lot.productId}::${lot.grItem.receipt.warehouseId}`;
        if (!lotPool.has(key)) lotPool.set(key, []);
        lotPool.get(key)!.push({
            lotId: lot.id,
            remaining: lot.initialQty,
            purchasePrice: Number(lot.purchasePrice),
            landedCost: lot.landedCost ? Number(lot.landedCost) : null
        });
    }

    // Phase 3: Simulate FIFO allocation for ALL SD items
    type NewAllocation = {
        lotId: string;
        sdItemId: string;
        qty: number;
        hppAtTime: number;
    };
    
    const newAllocations: NewAllocation[] = [];
    let totalAllocated = 0;
    let totalUnallocated = 0;
    let totalItems = 0;
    const unallocatedItems: string[] = [];

    for (const sdItem of allSDItems) {
        totalItems++;
        let remaining = sdItem.quantity;
        const key = `${sdItem.productId}::${sdItem.delivery.warehouseId}`;
        const lots = lotPool.get(key) || [];

        for (const lot of lots) {
            if (remaining <= 0) break;
            if (lot.remaining <= 0) continue;

            const consume = Math.min(remaining, lot.remaining);
            const hpp = lot.landedCost ?? lot.purchasePrice;

            newAllocations.push({
                lotId: lot.lotId,
                sdItemId: sdItem.id,
                qty: consume,
                hppAtTime: hpp
            });

            lot.remaining -= consume;
            remaining -= consume;
            totalAllocated += consume;
        }

        if (remaining > 0) {
            totalUnallocated += remaining;
            unallocatedItems.push(
                `${sdItem.delivery.deliveryNumber} | ${sdItem.product.name.substring(0, 25)} | need=${sdItem.quantity} unalloc=${remaining}`
            );
        }
    }

    console.log(`   Total SD items processed: ${totalItems}`);
    console.log(`   Total allocations to create: ${newAllocations.length}`);
    console.log(`   Total qty allocated: ${totalAllocated}`);
    console.log(`   Total qty unallocated (no lot available): ${totalUnallocated}`);
    if (unallocatedItems.length > 0) {
        console.log(`\n   ⚠️  ${unallocatedItems.length} items partially/fully unallocated (first 20):`);
        for (const item of unallocatedItems.slice(0, 20)) {
            console.log(`      ${item}`);
        }
    }

    // Phase 4: Calculate final remainingQty for each lot
    console.log("\n📊 Phase 3: Calculating final lot quantities...");
    const finalLotQty = new Map<string, number>();
    for (const lot of validLots) {
        finalLotQty.set(lot.id, lot.initialQty);
    }
    for (const alloc of newAllocations) {
        const current = finalLotQty.get(alloc.lotId) || 0;
        finalLotQty.set(alloc.lotId, current - alloc.qty);
    }

    // Phase 5: Execute in transaction
    console.log("\n🔄 Phase 4: Executing migration in transaction...");
    
    await prisma.$transaction(async (tx) => {
        // Step 1: Delete all existing LotAllocations
        const deleted = await tx.lotAllocation.deleteMany({});
        console.log(`   Deleted ${deleted.count} existing allocations`);

        // Step 2: Create all new allocations in batches
        const BATCH_SIZE = 500;
        for (let i = 0; i < newAllocations.length; i += BATCH_SIZE) {
            const batch = newAllocations.slice(i, i + BATCH_SIZE);
            await tx.lotAllocation.createMany({
                data: batch.map(a => ({
                    lotId: a.lotId,
                    sdItemId: a.sdItemId,
                    qty: a.qty,
                    hppAtTime: new Prisma.Decimal(a.hppAtTime)
                }))
            });
            console.log(`   Created allocations: ${Math.min(i + BATCH_SIZE, newAllocations.length)}/${newAllocations.length}`);
        }

        // Step 3: Update remainingQty on all lots
        let lotUpdates = 0;
        for (const [lotId, qty] of finalLotQty) {
            await tx.productLot.update({
                where: { id: lotId },
                data: { remainingQty: Math.max(0, qty) }
            });
            lotUpdates++;
        }
        console.log(`   Updated ${lotUpdates} lot remainingQty values`);
    }, { timeout: 120000 });

    console.log("\n✅ Migration complete!");
    
    // Verification
    console.log("\n=== POST-MIGRATION VERIFICATION ===");
    const sdWithAlloc = await prisma.salesDeliveryItem.count({
        where: { lotAllocations: { some: {} }, delivery: { isVoid: false } }
    });
    const sdWithoutAlloc = await prisma.salesDeliveryItem.count({
        where: { lotAllocations: { none: {} }, delivery: { isVoid: false } }
    });
    const totalAllocs = await prisma.lotAllocation.count();
    console.log(`   SD items with allocation: ${sdWithAlloc}`);
    console.log(`   SD items without allocation: ${sdWithoutAlloc}`);
    console.log(`   Total LotAllocation records: ${totalAllocs}`);
}

migrate()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
