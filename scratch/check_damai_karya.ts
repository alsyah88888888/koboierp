import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkKitKatDamaiKarya() {
    const product = await prisma.product.findFirst({ where: { barcode: '8992696527874' } });
    if (!product) return;

    // Check sales deliveries to Damai Karya
    const sales = await prisma.salesDelivery.findMany({
        where: {
            OR: [
                { buyerName: { contains: 'DAMAI KARYA', mode: 'insensitive' } },
                { recipient: { contains: 'DAMAI KARYA', mode: 'insensitive' } }
            ]
        },
        include: {
            items: {
                where: { productId: product.id }
            }
        },
        orderBy: { date: 'desc' }
    });

    console.log("=== SALES DELIVERIES TO DAMAI KARYA ABADI ===");
    for (const sale of sales) {
        if (sale.items.length > 0) {
            console.log(`SJ: ${sale.deliveryNumber} | Date: ${sale.date} | Void: ${sale.isVoid}`);
            for (const item of sale.items) {
                console.log(`   -> Kit Kat Qty: ${item.quantity}`);
            }
        }
    }

    // Check movements related to 77 qty or Damai Karya
    const movements = await prisma.stockMovement.findMany({
        where: {
            productId: product.id,
            OR: [
                { reference: { contains: 'DAMAI KARYA', mode: 'insensitive' } },
                { quantity: { in: [77, -77] } }
            ]
        },
        orderBy: { createdAt: 'desc' }
    });

    console.log("\n=== RELATED STOCK MOVEMENTS (Qty 77 or -77) ===");
    for (const m of movements) {
        console.log(`[${m.createdAt.toISOString()}] ${m.type} | Qty: ${m.quantity} | Ref: ${m.reference}`);
    }
}

checkKitKatDamaiKarya().catch(console.error).finally(() => prisma.$disconnect());
