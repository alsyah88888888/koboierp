import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setStockToPhysical() {
    const productId = 'cmm3z2xkv00avuumcc2mozac2';
    const physicalQty = 46; // 46 ctn as confirmed by user

    const warehouse = await prisma.warehouse.findFirst();
    if (!warehouse) return;

    // Get current stock
    const currentStocks = await prisma.stock.findMany({ where: { productId } });
    const currentTotal = currentStocks.reduce((s, st) => s + Number(st.quantity), 0);
    
    console.log(`Current stock in DB: ${currentTotal}`);
    console.log(`Physical actual: ${physicalQty}`);
    console.log(`Adjustment needed: ${physicalQty - currentTotal}`);

    // Delete all existing stock records for this product
    await prisma.stock.deleteMany({ where: { productId } });

    // Create one consolidated record
    await prisma.stock.create({
        data: {
            productId,
            warehouseId: warehouse.id,
            vendorName: 'UMUM',
            quantity: physicalQty
        }
    });

    // Add adjustment movement to reconcile
    const diff = physicalQty - currentTotal;
    if (diff !== 0) {
        // First remove previous adjustment
        await prisma.stockMovement.deleteMany({
            where: { productId, reference: 'PENYESUAIAN-FISIK-01072026' }
        });
        
        await prisma.stockMovement.create({
            data: {
                productId,
                warehouseId: warehouse.id,
                vendorName: 'UMUM',
                quantity: diff,
                type: diff > 0 ? 'IN' : 'OUT',
                reference: 'PENYESUAIAN-FISIK-01072026'
            }
        });
    }

    // Verify
    const newStock = await prisma.stock.findMany({ where: { productId } });
    console.log(`\n✅ Stock set to: ${newStock[0].quantity} (physical: ${physicalQty})`);
}

setStockToPhysical().catch(console.error).finally(() => prisma.$disconnect());
