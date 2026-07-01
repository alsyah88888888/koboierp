import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function investigateCase() {
    const product = await prisma.product.findFirst({
        where: { barcode: '8992696527874' }
    });

    if (!product) { console.log("Product not found"); return; }

    console.log(`Product: ${product.name} (ID: ${product.id})\n`);

    // 1. Current stock
    const stocks = await prisma.stock.findMany({
        where: { productId: product.id },
        include: { warehouse: true }
    });
    let totalStock = 0;
    console.log("=== CURRENT STOCK ===");
    for (const s of stocks) {
        console.log(`  ${s.warehouse.name} | Vendor: ${s.vendorName} | Qty: ${s.quantity}`);
        totalStock += Number(s.quantity);
    }
    console.log(`  TOTAL: ${totalStock}\n`);

    // 2. Find all VOIDED sales deliveries that contain this product
    console.log("=== VOIDED SALES DELIVERIES (isVoid=true) CONTAINING THIS PRODUCT ===");
    const voidedDeliveries = await prisma.salesDelivery.findMany({
        where: {
            isVoid: true,
            items: { some: { productId: product.id } }
        },
        include: {
            items: {
                where: { productId: product.id }
            }
        },
        orderBy: { date: 'desc' }
    });

    for (const d of voidedDeliveries) {
        const qty = d.items.reduce((sum, i) => sum + Number(i.quantity), 0);
        console.log(`  ${d.deliveryNumber} | Date: ${d.date.toISOString().slice(0,10)} | Qty: ${qty} | Buyer: ${d.buyerName} | VoidReason: ${d.voidReason}`);
        
        // Check if there's a SALE_VOID movement for this
        const voidMov = await prisma.stockMovement.findFirst({
            where: { productId: product.id, type: 'SALE_VOID', reference: d.deliveryNumber }
        });
        const saleMov = await prisma.stockMovement.findFirst({
            where: { productId: product.id, type: 'SALE', reference: d.deliveryNumber }
        });
        console.log(`    -> SALE movement: ${saleMov ? `qty ${saleMov.quantity}` : 'NONE'}`);
        console.log(`    -> SALE_VOID movement: ${voidMov ? `qty ${voidMov.quantity}` : 'MISSING ⚠️'}`);
    }

    // 3. Find ALL movements for this product in the last few days
    console.log("\n=== ALL STOCK MOVEMENTS (Last 30) ===");
    const movements = await prisma.stockMovement.findMany({
        where: { productId: product.id },
        orderBy: { createdAt: 'desc' },
        take: 30
    });
    for (const m of movements) {
        console.log(`  ${m.createdAt.toISOString()} | ${m.type.padEnd(12)} | Qty: ${String(m.quantity).padStart(6)} | Ref: ${m.reference}`);
    }

    // 4. Recalculate expected stock from all movements
    const allMovements = await prisma.stockMovement.findMany({
        where: { productId: product.id }
    });
    let expectedStock = 0;
    for (const m of allMovements) {
        expectedStock += Number(m.quantity);
    }
    console.log(`\n=== SUMMARY ===`);
    console.log(`Current Stock in DB: ${totalStock}`);
    console.log(`Expected from movements: ${expectedStock}`);
    console.log(`Difference: ${totalStock - expectedStock}`);
}

investigateCase().catch(console.error).finally(() => prisma.$disconnect());
