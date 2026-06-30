import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixDoubleStockOnVoidAndDelete() {
    console.log("=== FIX DOUBLE STOCK FROM VOID + DELETE ===");

    // Find all SALE_VOID movements
    const voidMovements = await prisma.stockMovement.findMany({
        where: { type: 'SALE_VOID' },
        select: { reference: true }
    });

    const voidedRefs = new Set(voidMovements.map(m => m.reference).filter(Boolean));

    console.log(`Found ${voidedRefs.size} unique voided references.`);

    // Find all SALE_DELETE movements that share the same reference as a SALE_VOID
    // This means the delivery was VOIDED and then DELETED, causing double stock restoration!
    const doubleDeletes = await prisma.stockMovement.findMany({
        where: {
            type: 'SALE_DELETE',
            reference: { in: Array.from(voidedRefs) as string[] }
        },
        include: { product: true }
    });

    if (doubleDeletes.length === 0) {
        console.log("No double stock restorations found.");
        return;
    }

    console.log(`Found ${doubleDeletes.length} duplicate SALE_DELETE movements to reverse.\n`);

    for (const movement of doubleDeletes as any[]) {
        if (!movement.quantity) continue;

        console.log(`- Reversing duplicate restore for ${movement.product?.name || movement.productId}`);
        console.log(`  Ref: ${movement.reference}, Qty: ${movement.quantity}`);

        // 1. Deduct the incorrectly added stock
        await prisma.stock.updateMany({
            where: {
                productId: movement.productId,
                warehouseId: movement.warehouseId,
                vendorName: movement.vendorName || "UMUM"
            },
            data: {
                quantity: { decrement: movement.quantity } // Reverse the duplicate addition
            }
        });

        // 2. Delete the duplicate movement
        await prisma.stockMovement.delete({
            where: { id: movement.id }
        });

        console.log(`  -> Fixed! Deducted ${movement.quantity} from stock and removed movement.`);
    }

    console.log("\n=== ALL DUPLICATE STOCK FIXED ===");
}

fixDoubleStockOnVoidAndDelete()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
