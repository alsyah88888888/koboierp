import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkWhoDidIt() {
    const receipt = await prisma.goodsReceipt.findFirst({
        where: { receiptNumber: 'KB-LPBD-24022026-007' }
    });
    
    if (receipt) {
        console.log(`Receipt createdById: ${receipt.createdById}`);
        console.log(`Receipt updatedBy: ${receipt.updatedById || 'N/A'}`);
    }
    
    const product = await prisma.product.findFirst({ where: { barcode: '8992696527874' } });
    if (!product) return;

    const allMovs = await prisma.stockMovement.findMany({
        where: { productId: product.id }
    });

    let total = 0;
    for (const m of allMovs) {
        if (m.reference !== 'KOREKSI-FISIK-01072026-FINAL') {
            total += Number(m.quantity);
        }
    }
    
    console.log(`Total from all other movements: ${total}`);
    console.log(`Target balance: 45`);
    console.log(`Required adjustment qty in KOREKSI-FISIK-01072026-FINAL: ${45 - total}`);
    
    // Fix the final movement right now
    const finalMov = await prisma.stockMovement.findFirst({
        where: { reference: 'KOREKSI-FISIK-01072026-FINAL' }
    });
    if (finalMov) {
        const requiredQty = 45 - total;
        await prisma.stockMovement.update({
            where: { id: finalMov.id },
            data: { quantity: requiredQty }
        });
        console.log(`Fixed KOREKSI-FISIK-01072026-FINAL quantity to ${requiredQty}`);
    }
}

checkWhoDidIt().catch(console.error).finally(() => prisma.$disconnect());
