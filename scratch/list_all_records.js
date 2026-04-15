const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listAllReceipts(sku) {
    try {
        console.log(`--- ALL RECEIPTS FOR: ${sku} ---`);
        const items = await prisma.goodsReceiptItem.findMany({
            where: { product: { sku } },
            include: { receipt: true }
        });
        
        items.forEach(i => {
            console.log(`ID: ${i.receipt.id}, Form: ${i.receipt.formNumber}, Date: ${i.receipt.date}, Verified: ${i.receipt.isVerified}, Void: ${i.receipt.isVoid}`);
        });

        console.log(`\n--- ALL MOVEMENTS FOR: ${sku} ---`);
        const moves = await prisma.stockMovement.findMany({
            where: { product: { sku } }
        });
        moves.forEach(m => {
            console.log(`Type: ${m.type}, Qty: ${m.quantity}, Ref: ${m.referenceNumber}, Date: ${m.date}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

listAllReceipts("BEVPIKOPI-540");
