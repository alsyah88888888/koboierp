import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deepCheck() {
    const productId = 'cmm3z2xkv00avuumcc2mozac2';

    // Check SJ-679-15042026-001 specifically — qty 1680 but SALE=-1000, SALE_VOID=1530
    console.log("=== SJ-679-15042026-001 DETAIL ===");
    const movs679 = await prisma.stockMovement.findMany({
        where: { productId, reference: 'SJ-679-15042026-001' },
        orderBy: { createdAt: 'asc' }
    });
    for (const m of movs679) {
        console.log(`  ${m.createdAt.toISOString()} | ${m.type.padEnd(20)} | Qty: ${m.quantity} | Vendor: ${m.vendorName}`);
    }

    // Now, let's check the SALE_UPDATE issue
    // User says: "ada input yang sudah di batalkan namun tidak terpotong di stock"
    // This means: a SJ was voided, but the SALE_UPDATE movements for that SJ were NOT reversed
    
    console.log("\n=== CHECKING: VOIDED SJs WITH SALE_UPDATE MOVEMENTS ===");
    const voidedSJs = await prisma.salesDelivery.findMany({
        where: { isVoid: true, items: { some: { productId } } },
        select: { deliveryNumber: true, date: true, buyerName: true }
    });

    for (const sj of voidedSJs) {
        const updateMovs = await prisma.stockMovement.findMany({
            where: { productId, reference: sj.deliveryNumber, type: 'SALE_UPDATE' },
        });
        if (updateMovs.length > 0) {
            const totalUpdateQty = updateMovs.reduce((s, m) => s + Number(m.quantity), 0);
            console.log(`  ⚠️ ${sj.deliveryNumber} (VOIDED) has ${updateMovs.length} SALE_UPDATE movements totaling ${totalUpdateQty}`);
            for (const m of updateMovs) {
                console.log(`     ${m.createdAt.toISOString()} | Qty: ${m.quantity}`);
            }
        }
    }

    // Also check: non-voided SJs that were maybe deleted
    // The user mentioned "dibatalkan" which could mean void OR delete
    console.log("\n=== SALE_UPDATE movements for Kit Kat (all) ===");
    const allUpdates = await prisma.stockMovement.findMany({
        where: { productId, type: 'SALE_UPDATE' },
        orderBy: { createdAt: 'desc' }
    });
    for (const m of allUpdates) {
        // Check if the referenced SJ still exists and its status
        const sj = await prisma.salesDelivery.findFirst({
            where: { deliveryNumber: m.reference! }
        });
        const status = sj ? (sj.isVoid ? 'VOIDED' : 'ACTIVE') : 'DELETED';
        console.log(`  ${m.createdAt.toISOString()} | Qty: ${String(m.quantity).padStart(6)} | Ref: ${m.reference} | SJ Status: ${status}`);
    }
}

deepCheck().catch(console.error).finally(() => prisma.$disconnect());
