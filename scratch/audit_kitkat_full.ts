import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkKitKatFull() {
    const product = await prisma.product.findFirst({ where: { barcode: '8992696527874' } });
    if (!product) return;

    console.log(`=== KIT KAT (${product.name}) ===\n`);

    // All stock records
    const stocks = await prisma.stock.findMany({
        where: { productId: product.id },
        include: { warehouse: true }
    });
    let total = 0;
    console.log("STOCK RECORDS IN DB:");
    for (const s of stocks) {
        console.log(`  [${s.warehouse.name}] Vendor: ${s.vendorName} | Qty: ${s.quantity}`);
        total += Number(s.quantity);
    }
    console.log(`  TOTAL: ${total}`);

    // All movements after last adjustment
    const allMovs = await prisma.stockMovement.findMany({
        where: { productId: product.id },
        orderBy: { createdAt: 'desc' },
        take: 20
    });
    console.log("\nLAST 20 MOVEMENTS:");
    let runningTotal = 0;
    const allMovsForTotal = await prisma.stockMovement.findMany({ where: { productId: product.id } });
    for (const m of allMovsForTotal) runningTotal += Number(m.quantity);
    
    for (const m of allMovs) {
        console.log(`  ${m.createdAt.toISOString().slice(0,19)} | ${m.type.padEnd(20)} | ${String(m.quantity).padStart(7)} | ${m.reference}`);
    }
    console.log(`\n  Total from movements: ${runningTotal}`);
    console.log(`  Total in stock table: ${total}`);
    console.log(`  DIFFERENCE: ${total - runningTotal}`);
}

checkKitKatFull().catch(console.error).finally(() => prisma.$disconnect());
