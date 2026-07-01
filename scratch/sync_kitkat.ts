import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function syncKitKatStock() {
    const product = await prisma.product.findFirst({
        where: { barcode: '8992696527874' }
    });

    if (!product) { console.log("Not found"); return; }

    const allMovements = await prisma.stockMovement.findMany({
        where: { productId: product.id },
        orderBy: { createdAt: 'asc' }
    });

    const stockMap: Record<string, number> = {}; 
    let totalQty = 0;

    for (const mov of allMovements) {
        const vendorKey = mov.vendorName ? mov.vendorName : 'NULL';
        const key = `${mov.warehouseId}_${vendorKey}`;
        if (!stockMap[key]) stockMap[key] = 0;
        
        stockMap[key] += Number(mov.quantity);
        totalQty += Number(mov.quantity);
    }

    console.log(`Re-calculated Stock based on movements:`);
    for (const [key, qty] of Object.entries(stockMap)) {
        const [wId, vName] = key.split('_');
        const dbVendor = vName === 'NULL' ? 'UMUM' : vName;
        
        console.log(`- Warehouse ID: ${wId}, Vendor: ${dbVendor}, Expected Qty: ${qty}`);
        
        await prisma.stock.upsert({
            where: {
                productId_warehouseId_vendorName: {
                    productId: product.id,
                    warehouseId: wId,
                    vendorName: dbVendor
                }
            },
            create: {
                productId: product.id,
                warehouseId: wId,
                vendorName: dbVendor,
                quantity: qty
            },
            update: { quantity: qty }
        });
    }

    console.log(`Stock updated! Total stock set to: ${totalQty}`);
}

syncKitKatStock().catch(console.error).finally(() => prisma.$disconnect());
