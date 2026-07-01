import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixVoidedSaleUpdates() {
    const productId = 'cmm3z2xkv00avuumcc2mozac2';

    console.log("=== FIX: Remove SALE_UPDATE movements for VOIDED SJs ===\n");

    // Find all voided SJs that have this product
    const voidedSJs = await prisma.salesDelivery.findMany({
        where: { isVoid: true, items: { some: { productId } } },
        select: { deliveryNumber: true }
    });

    let totalFixed = 0;
    for (const sj of voidedSJs) {
        const updateMovs = await prisma.stockMovement.findMany({
            where: { productId, reference: sj.deliveryNumber, type: 'SALE_UPDATE' },
        });
        
        if (updateMovs.length > 0) {
            const totalQty = updateMovs.reduce((s, m) => s + Number(m.quantity), 0);
            console.log(`Removing ${updateMovs.length} SALE_UPDATE for ${sj.deliveryNumber} (total: ${totalQty})`);
            
            // Delete these orphaned SALE_UPDATE movements
            await prisma.stockMovement.deleteMany({
                where: {
                    productId,
                    reference: sj.deliveryNumber,
                    type: 'SALE_UPDATE'
                }
            });
            
            totalFixed += updateMovs.length;
        }
    }

    // Also check for DELETED SJs with SALE_UPDATE
    const allUpdateMovs = await prisma.stockMovement.findMany({
        where: { productId, type: 'SALE_UPDATE' }
    });
    
    for (const m of allUpdateMovs) {
        const sjExists = await prisma.salesDelivery.findFirst({
            where: { deliveryNumber: m.reference! }
        });
        if (!sjExists) {
            console.log(`Removing orphaned SALE_UPDATE for DELETED SJ ${m.reference} (qty: ${m.quantity})`);
            await prisma.stockMovement.delete({ where: { id: m.id } });
            totalFixed++;
        }
    }

    console.log(`\nFixed ${totalFixed} orphaned SALE_UPDATE movements.`);

    // Now recalculate the expected stock
    const allMovements = await prisma.stockMovement.findMany({
        where: { productId }
    });
    let expectedStock = 0;
    for (const m of allMovements) {
        expectedStock += Number(m.quantity);
    }

    // Get current stock
    const stocks = await prisma.stock.findMany({ where: { productId } });
    const currentStock = stocks.reduce((s, st) => s + Number(st.quantity), 0);

    console.log(`\nCurrent Stock in DB: ${currentStock}`);
    console.log(`Expected from movements (after cleanup): ${expectedStock}`);
    
    // Update stock to match movements
    if (currentStock !== expectedStock) {
        // Delete all and set to one consolidated entry
        await prisma.stock.deleteMany({ where: { productId } });
        
        const warehouse = await prisma.warehouse.findFirst();
        await prisma.stock.create({
            data: {
                productId,
                warehouseId: warehouse!.id,
                vendorName: 'UMUM',
                quantity: expectedStock
            }
        });
        console.log(`Stock updated to ${expectedStock} pcs`);
    }
}

fixVoidedSaleUpdates().catch(console.error).finally(() => prisma.$disconnect());
