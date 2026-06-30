import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function debugBuyPrice() {
    const invoiceNo = 'KB-TRN-30062026-005';
    const deliveryNo = 'SJ-612-29062026-015';

    // Get the sales delivery
    const sd = await prisma.salesDelivery.findFirst({
        where: { OR: [{ invoiceNumber: invoiceNo }, { deliveryNumber: deliveryNo }] },
        include: { items: { include: { product: true } } }
    });

    if (!sd) { console.log("SD not found"); return; }
    console.log("=== SALES DELIVERY ===");
    console.log(`  Nomor SJ     : ${sd.deliveryNumber}`);
    console.log(`  Invoice      : ${sd.invoiceNumber}`);
    console.log(`  Tax Rate     : ${sd.taxRate}%`);
    console.log(`  Items:`);
    for (const item of sd.items) {
        console.log(`    - ${item.product.name} | Qty: ${item.quantity} | Sales Price: ${item.salesPrice} | HPP DB: ${item.product.purchasePrice} | Discount: ${item.discount}`);
    }

    // Find matching GR for this product around that date
    const targetDate = new Date('2026-06-20T00:00:00+07:00');
    const startDate  = new Date('2026-05-01T00:00:00+07:00');
    
    for (const item of sd.items) {
        const grItems = await prisma.goodsReceiptItem.findMany({
            where: {
                productId: item.productId,
                receipt: { date: { gte: startDate, lte: new Date('2026-06-30T23:59:59+07:00') } }
            },
            include: { receipt: true },
            orderBy: { receipt: { date: 'desc' } },
            take: 5
        });

        console.log(`\n=== GR MATCHES for ${item.product.name} (qty=${item.quantity}) ===`);
        for (const gr of grItems) {
            const dppBeli = Number(gr.purchasePrice) * item.quantity;
            const totalBeli = Math.round(dppBeli * (1 + Number(sd.taxRate) / 100));
            const totalBeliGRTax = Math.round(dppBeli * (1 + Number(gr.receipt.taxRate || 0) / 100));
            console.log(`  LPB: ${gr.receipt.receiptNumber} | Date: ${gr.receipt.date?.toISOString().split('T')[0] ?? '-'}`);
            console.log(`  HPP/unit: ${gr.purchasePrice} | GR TaxRate: ${gr.receipt.taxRate}%`);
            console.log(`  → DPP Beli       : ${dppBeli.toLocaleString()}`);
            console.log(`  → Total Beli (SD tax ${sd.taxRate}%): ${totalBeli.toLocaleString()}`);
            console.log(`  → Total Beli (GR tax ${gr.receipt.taxRate}%): ${totalBeliGRTax.toLocaleString()}`);
        }
    }
}

debugBuyPrice().catch(console.error).finally(() => prisma.$disconnect());
