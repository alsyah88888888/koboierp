import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testStockUpdate() {
    console.log("=== CHECK STOCK MOVEMENT & SALES DELIVERY ITEMS ===");
    
    // Find Kit Kat deliveries
    const deliveries = await prisma.salesDeliveryItem.findMany({
        where: {
            product: { name: { contains: 'KIT KAT', mode: 'insensitive' } }
        },
        include: {
            delivery: true
        }
    });

    console.log(`Found ${deliveries.length} deliveries for Kit Kat`);
    
    const stock = await prisma.stock.findMany({
        where: { product: { name: { contains: 'KIT KAT', mode: 'insensitive' } } },
        include: { product: true }
    });

    console.log(`Current Stock records:`);
    for (const s of stock) {
        console.log(`  - ${s.product.name} | Qty: ${s.quantity} | Vendor: ${s.vendorName}`);
    }

    const movements = await prisma.stockMovement.findMany({
        where: { product: { name: { contains: 'KIT KAT', mode: 'insensitive' } } },
        orderBy: { createdAt: 'desc' },
        take: 20
    });

    console.log(`\nRecent movements:`);
    for (const m of movements) {
        console.log(`  - ${m.createdAt} | ${m.type} | Qty: ${m.quantity} | Ref: ${m.reference}`);
    }
}

testStockUpdate().finally(() => prisma.$disconnect());
