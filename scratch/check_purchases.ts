import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPurchases() {
    const product = await prisma.product.findFirst({
        where: { barcode: '8992696527874' }
    });

    if (!product) return;

    const grItems = await prisma.goodsReceiptItem.findMany({
        where: { productId: product.id },
        include: {
            receipt: true
        },
        orderBy: { receipt: { date: 'desc' } }
    });

    console.log("=== PURCHASE RECEIPTS FOR KIT KAT ===");
    for (const item of grItems) {
        console.log(`- ${item.receipt.date?.toISOString()} | Qty: ${item.quantity} | Void: ${item.receipt.isVoid} | Ref: ${item.receipt.receiptNumber}`);
    }
}

checkPurchases().catch(console.error).finally(() => prisma.$disconnect());
