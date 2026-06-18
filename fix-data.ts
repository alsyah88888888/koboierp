const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const gr = await prisma.goodsReceipt.findFirst({
        where: { receiptNumber: 'KB-LPBD-06062026-004' },
        include: { items: true }
    });
    if (gr) {
        // Update items to 167700
        for (const item of gr.items) {
            await prisma.goodsReceiptItem.update({
                where: { id: item.id },
                data: { purchasePrice: 167700 }
            });
        }
        
        // Recalculate GR totals
        const newSubtotal = gr.items.reduce((acc, item) => acc + (167700 * item.quantity), 0);
        const newTax = Math.round(newSubtotal * 0.11);
        const newGrandTotal = newSubtotal + newTax;
        
        await prisma.goodsReceipt.update({
            where: { id: gr.id },
            data: { 
                subtotal: newSubtotal,
                taxAmount: newTax,
                grandTotal: newGrandTotal,
                paidAmount: newGrandTotal
            }
        });
        console.log(`Updated GR to subtotal: ${newSubtotal}, tax: ${newTax}, grandTotal: ${newGrandTotal}`);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
