import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkKitKatStock() {
    const barcode = '8992696527874';
    const product = await prisma.product.findFirst({
        where: { OR: [{ barcode }, { name: { contains: 'KIT KAT CHOCOLATE 24x220ml' } }] },
        include: {
            stocks: {
                include: { warehouse: true }
            }
        }
    });

    if (!product) { return; }

    const allMovements = await prisma.stockMovement.findMany({
        where: { productId: product.id },
        orderBy: { createdAt: 'asc' }
    });
    
    let sum = 0;
    console.log("=== MOVEMENT HISTORY (Last 20) ===");
    for (const mov of allMovements) {
        sum += Number(mov.quantity);
    }
    
    // Just print the last 20 to see what happened recently
    for (const mov of allMovements.slice(-20)) {
        console.log(`- ${mov.createdAt.toISOString()} | Type: ${mov.type.padEnd(12)} | Qty: ${String(mov.quantity).padStart(5)} | Ref: ${mov.reference || 'N/A'}`);
    }
    console.log(`\nEXPECTED STOCK FROM MOVEMENTS: ${sum}`);
    
    let actualStock = 0;
    for (const stock of product.stocks) {
        actualStock += Number(stock.quantity);
    }
    console.log(`ACTUAL STOCK IN DB: ${actualStock}`);
    
    // Let's also check if there are deleted movements that caused this mismatch
    // (we deleted some earlier!)
}

checkKitKatStock().catch(console.error).finally(() => prisma.$disconnect());
