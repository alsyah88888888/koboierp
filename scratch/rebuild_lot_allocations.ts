/**
 * REBUILD LOT ALLOCATIONS
 * Menghapus semua LotAllocation dan membangun ulang dari awal
 * berdasarkan urutan kronologis (sesuai Lifecycle Tracking).
 *
 * Algoritma:
 * 1. Delete semua LotAllocation
 * 2. Reset semua ProductLot.remainingQty = initialQty
 * 3. Per produk: FIFO berdasarkan grDate asc → konsumsi dari SalesDelivery urut date asc
 * 4. Tulis LotAllocation baru + update remainingQty
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('=== REBUILD LOT ALLOCATIONS ===');
    console.log('Mulai proses rebuild...\n');

    // ── STEP 1: Hapus semua LotAllocation ──
    const deleted = await prisma.lotAllocation.deleteMany({});
    console.log(`✅ Hapus ${deleted.count} LotAllocation lama`);

    // ── STEP 2: Reset semua ProductLot.remainingQty = initialQty ──
    await prisma.productLot.updateMany({
        where: { isVoided: false },
        data: {} // we'll do it per-lot below via raw
    });

    // Get all non-voided lots
    const allLots = await prisma.productLot.findMany({
        where: { isVoided: false },
        select: { id: true }
    });
    
    // Reset remainingQty to initialQty for all
    await prisma.$executeRaw`UPDATE "ProductLot" SET "remainingQty" = "initialQty" WHERE "isVoided" = false`;
    console.log(`✅ Reset ${allLots.length} ProductLot.remainingQty = initialQty\n`);

    // ── STEP 3: Get all distinct productIds that have lots ──
    const distinctProducts = await prisma.productLot.findMany({
        where: { isVoided: false },
        select: { productId: true },
        distinct: ['productId']
    });

    console.log(`📦 Memproses ${distinctProducts.length} produk...\n`);

    let totalAllocCreated = 0;
    let productsProcessed = 0;

    for (const { productId } of distinctProducts) {
        // Get lots for this product, FIFO order (oldest grDate first)
        const lots = await prisma.productLot.findMany({
            where: { productId, isVoided: false, remainingQty: { gt: 0 } },
            orderBy: { grDate: 'asc' }
        });

        if (lots.length === 0) continue;

        // Get all SalesDeliveryItems for this product (from non-void deliveries), ordered by delivery date asc
        const sdItems = await (prisma as any).salesDeliveryItem.findMany({
            where: {
                productId,
                delivery: { isVoid: false }
            },
            include: {
                delivery: { select: { date: true, warehouseId: true } }
            },
            orderBy: {
                delivery: { date: 'asc' }
            }
        });

        if (sdItems.length === 0) continue;

        // FIFO allocation
        // We keep a mutable copy of remaining per lot
        const lotRemaining: Map<string, { remaining: number; hpp: number }> = new Map();
        for (const lot of lots) {
            lotRemaining.set(lot.id, {
                remaining: Number(lot.initialQty),
                hpp: Number(lot.landedCost ?? lot.purchasePrice ?? 0)
            });
        }

        // Sort lots by grDate asc (already sorted but let's be explicit)
        const sortedLots = [...lots].sort((a, b) =>
            new Date(a.grDate).getTime() - new Date(b.grDate).getTime()
        );

        const newAllocations: { lotId: string; sdItemId: string; qty: number; hppAtTime: number }[] = [];

        for (const sdItem of sdItems) {
            let remaining = Number(sdItem.quantity);

            for (const lot of sortedLots) {
                if (remaining <= 0) break;

                const lotData = lotRemaining.get(lot.id);
                if (!lotData || lotData.remaining <= 0) continue;

                // Only use lots with grDate <= sale date (can't sell before buying)
                const saleDate = new Date(sdItem.delivery.date);
                const lotDate = new Date(lot.grDate);
                if (lotDate > saleDate) continue;

                const consume = Math.min(remaining, lotData.remaining);
                lotData.remaining -= consume;
                remaining -= consume;

                newAllocations.push({
                    lotId: lot.id,
                    sdItemId: sdItem.id,
                    qty: consume,
                    hppAtTime: lotData.hpp
                });
            }
            // If remaining > 0 after all lots exhausted: unallocated (historical sales before ERP)
            // This is OK - traceability will handle gracefully
        }

        // Write LotAllocations in batch
        if (newAllocations.length > 0) {
            await (prisma as any).lotAllocation.createMany({
                data: newAllocations.map(a => ({
                    lotId: a.lotId,
                    sdItemId: a.sdItemId,
                    qty: a.qty,
                    hppAtTime: a.hppAtTime
                })),
                skipDuplicates: true
            });
            totalAllocCreated += newAllocations.length;
        }

        // Update actual remainingQty for each lot
        for (const lot of sortedLots) {
            const lotData = lotRemaining.get(lot.id);
            if (lotData) {
                await prisma.productLot.update({
                    where: { id: lot.id },
                    data: { remainingQty: Math.max(0, lotData.remaining) }
                });
            }
        }

        productsProcessed++;
        if (productsProcessed % 10 === 0) {
            console.log(`  [${productsProcessed}/${distinctProducts.length}] produk selesai...`);
        }
    }

    console.log(`\n✅ SELESAI!`);
    console.log(`   Produk diproses  : ${productsProcessed}`);
    console.log(`   Alokasi dibuat   : ${totalAllocCreated}`);

    // ── STEP 4: Verify - show summary of remaining lots ──
    console.log('\n=== VERIFIKASI SALDO LOT ===');
    const lotsWithRemaining = await prisma.productLot.findMany({
        where: { isVoided: false, remainingQty: { gt: 0 } },
        orderBy: { grDate: 'asc' },
        select: { lotNumber: true, grNumber: true, grDate: true, initialQty: true, remainingQty: true, supplierName: true }
    });
    
    console.log(`Total lot dengan sisa stok: ${lotsWithRemaining.length}`);
    
    // Show sunlight specifically
    const sunlightProduct = await prisma.product.findFirst({
        where: { name: { contains: 'Sunlight 610', mode: 'insensitive' } },
        select: { id: true, name: true }
    });
    
    if (sunlightProduct) {
        const sunlightLots = await prisma.productLot.findMany({
            where: { productId: sunlightProduct.id, isVoided: false },
            orderBy: { grDate: 'asc' },
            select: { grNumber: true, grDate: true, initialQty: true, remainingQty: true, supplierName: true }
        });
        console.log(`\nSunlight 610ml lots:`);
        for (const l of sunlightLots) {
            const flag = l.remainingQty > 0 ? '⚠️' : '✅';
            console.log(`  ${flag} ${l.grNumber} | ${l.grDate?.toISOString().slice(0,10)} | rem: ${l.remainingQty}`);
        }
    }
}

main()
    .catch(e => { console.error('❌ ERROR:', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
