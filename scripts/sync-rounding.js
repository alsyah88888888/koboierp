
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncRounding() {
    console.log("🚀 Starting Rounding Synchronization: Math.round()...");

    // 1. SYNC GOODS RECEIPTS
    const receipts = await prisma.goodsReceipt.findMany({
        include: { items: true }
    });
    console.log(`📦 Found ${receipts.length} Goods Receipts to sync.`);

    for (const gr of receipts) {
        let grossAmount = 0;
        let totalItemDiscounts = 0;
        
        gr.items.forEach((i) => {
            const lineGross = Number(i.quantity) * Number(i.purchasePrice);
            const lineDiscount = Number(i.discount || 0);
            grossAmount += lineGross;
            totalItemDiscounts += lineDiscount;
        });

        const subtotal = Math.round(grossAmount - totalItemDiscounts);
        const totalDiscountNominal = Math.round(Number(gr.totalDiscount) || 0);
        const taxRatePercent = Number(gr.taxRate) || 0;
        const taxAmount = Math.round((subtotal - totalDiscountNominal) * (taxRatePercent / 100));
        const grandTotal = Math.round(subtotal - totalDiscountNominal + taxAmount);

        if (gr.subtotal !== subtotal || gr.taxAmount !== taxAmount || gr.grandTotal !== grandTotal) {
            console.log(`🔧 Updating GR ${gr.receiptNumber}: ${gr.grandTotal} -> ${grandTotal}`);
            await prisma.goodsReceipt.update({
                where: { id: gr.id },
                data: {
                    subtotal,
                    taxAmount,
                    grandTotal
                }
            });
        }
    }

    // 2. SYNC SALES DELIVERIES
    const deliveries = await prisma.salesDelivery.findMany({
        include: { items: true }
    });
    console.log(`📦 Found ${deliveries.length} Sales Deliveries to sync.`);

    for (const sd of deliveries) {
        let grossAmount = 0;
        let totalItemDiscounts = 0;
        
        sd.items.forEach((i) => {
            const lineGross = Number(i.quantity) * Number(i.salesPrice || 0);
            const lineDiscount = Number(i.discount || 0);
            grossAmount += lineGross;
            totalItemDiscounts += lineDiscount;
        });

        const subtotal = Math.round(grossAmount - totalItemDiscounts);
        const totalDiscountNominal = Math.round(Number(sd.totalDiscount) || 0);
        const taxRatePercent = Number(sd.taxRate) || 0;
        const taxAmount = Math.round((subtotal - totalDiscountNominal) * (taxRatePercent / 100));
        const grandTotal = Math.round(subtotal - totalDiscountNominal + taxAmount);

        if (sd.subtotal !== subtotal || sd.taxAmount !== taxAmount || sd.grandTotal !== grandTotal) {
            console.log(`🔧 Updating SD ${sd.deliveryNumber}: ${sd.grandTotal} -> ${grandTotal}`);
            await prisma.salesDelivery.update({
                where: { id: sd.id },
                data: {
                    subtotal,
                    taxAmount,
                    grandTotal
                }
            });
        }
    }

    console.log("✅ Rounding Synchronization Completed!");
}

syncRounding()
    .catch(e => {
        console.error("❌ Sync Failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
