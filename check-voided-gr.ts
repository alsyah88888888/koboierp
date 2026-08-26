import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const gr = await prisma.goodsReceipt.findFirst({
        where: { receiptNumber: 'KB-LPBD-07082026-009' },
        include: { items: { include: { product: true } } }
    });
    
    console.log("Goods Receipt:", JSON.stringify(gr, null, 2));

    if (gr) {
        for (const item of gr.items) {
            const movements = await prisma.stockMovement.findMany({
                where: { 
                    productId: item.productId,
                    reference: gr.receiptNumber
                }
            });
            console.log(`Movements for ${item.product.name}:`, movements);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
