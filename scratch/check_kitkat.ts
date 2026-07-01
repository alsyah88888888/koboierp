import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkKitKatStock() {
    const barcode = '8992696527874';

    console.log(`Checking stock for barcode: ${barcode}`);

    const product = await prisma.product.findFirst({
        where: { OR: [{ barcode }, { name: { contains: 'KIT KAT CHOCOLATE 24x220ml' } }] },
        include: {
            stocks: {
                include: { warehouse: true }
            }
        }
    });

    if (!product) {
        console.log('Product not found!');
        return;
    }

    console.log(`Product found: ${product.name} (ID: ${product.id})`);
    console.log('Current Stock Entries:');
    let totalStock = 0;
    for (const stock of product.stocks) {
        console.log(`- Warehouse: ${stock.warehouse.name}, Vendor: ${stock.vendorName}, Qty: ${stock.quantity}`);
        totalStock += Number(stock.quantity);
    }
    console.log(`Total System Stock: ${totalStock}`);

    console.log('\nRecent Stock Movements (Last 10):');
    const movements = await prisma.stockMovement.findMany({
        where: { productId: product.id },
        orderBy: { createdAt: 'desc' },
        take: 10
    });

    for (const mov of movements) {
        console.log(`- ${mov.createdAt.toISOString()} | Type: ${mov.type.padEnd(12)} | Qty: ${String(mov.quantity).padStart(5)} | Ref: ${mov.reference || 'N/A'}`);
    }
    
    // Calculate total incoming and outgoing
    const allMovements = await prisma.stockMovement.findMany({
        where: { productId: product.id }
    });
    
    let inQty = 0;
    let outQty = 0;
    for (const mov of allMovements) {
        if (['IN', 'PURCHASE', 'SALE_RETURN', 'SALE_VOID', 'SALE_DELETE'].includes(mov.type)) {
            inQty += Number(mov.quantity);
        } else if (['OUT', 'SALE', 'SALE_UPDATE'].includes(mov.type)) {
            outQty += Number(mov.quantity);
        }
    }
    console.log(`\nMovement Summary: IN: ${inQty}, OUT: ${outQty}, BALANCE: ${inQty - outQty}`);

}

checkKitKatStock().catch(console.error).finally(() => prisma.$disconnect());
