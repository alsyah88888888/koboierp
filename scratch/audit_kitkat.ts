import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function auditAndFix() {
    const productId = 'cmm3z2xkv00avuumcc2mozac2';

    const allMovements = await prisma.stockMovement.findMany({
        where: { productId },
        orderBy: { createdAt: 'asc' }
    });

    console.log(`Total movements: ${allMovements.length}`);
    
    const byType: Record<string, { count: number; total: number }> = {};
    for (const m of allMovements) {
        if (!byType[m.type]) byType[m.type] = { count: 0, total: 0 };
        byType[m.type].count++;
        byType[m.type].total += Number(m.quantity);
    }
    
    console.log("\n=== MOVEMENTS BY TYPE ===");
    for (const [type, data] of Object.entries(byType)) {
        console.log(`  ${type.padEnd(25)} | Count: ${String(data.count).padStart(4)} | Total Qty: ${data.total}`);
    }

    const totalFromMovements = Object.values(byType).reduce((s, d) => s + d.total, 0);
    console.log(`\nTotal expected from movements: ${totalFromMovements}`);

    console.log("\n=== RECENT SALE QUANTITIES ===");
    const recentSales = await prisma.salesDeliveryItem.findMany({
        where: { productId },
        take: 10,
        orderBy: { deliveryId: 'desc' },
        include: { delivery: { select: { deliveryNumber: true, isVoid: true } } }
    });
    for (const s of recentSales) {
        console.log(`  ${s.delivery.deliveryNumber} | Qty: ${s.quantity} | UOM: ${s.uom} | Void: ${s.delivery.isVoid}`);
    }

    console.log("\n=== RECENT PURCHASE QUANTITIES ===");
    const recentPurchases = await prisma.goodsReceiptItem.findMany({
        where: { productId },
        take: 5,
        orderBy: { receiptId: 'desc' },
        include: { receipt: { select: { receiptNumber: true } } }
    });
    for (const p of recentPurchases) {
        console.log(`  ${p.receipt.receiptNumber} | Qty: ${p.quantity} | UOM: ${p.uom}`);
    }
}

auditAndFix().catch(console.error).finally(() => prisma.$disconnect());
