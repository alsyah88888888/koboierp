
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function smartRound(val) {
    if (!val) return 0;
    const v = Number(val);
    
    // SMART SNAP: If within 10 units of a hundred (e.g. ...94 or ...06), snap to nearest hundred.
    // This handles the 449.999.994 -> 450.000.000 case beautifully.
    const remainder = Math.abs(v % 100);
    if (remainder >= 90 || (remainder <= 10 && remainder > 0)) {
        return Math.round(v / 100) * 100;
    }
    
    // Default: Round to nearest whole Rupiah
    return Math.round(v);
}

async function syncFinal() {
    console.log("🚀 Starting Final Smart Rounding Synchronization (Robust + Snap)...");

    // 1. SYNC GOODS RECEIPTS
    const receipts = await prisma.goodsReceipt.findMany({
        include: { items: true }
    });
    console.log(`📦 Found ${receipts.length} Goods Receipts to sync.`);

    const allNumbers = new Set(receipts.map(r => r.receiptNumber));

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
        
        // Apply Smart Rounding to Tax and Grand Total
        const baseForTax = subtotal - totalDiscountNominal;
        const rawTax = baseForTax * (taxRatePercent / 100);
        const taxAmount = Math.round(rawTax);
        
        let grandTotal = smartRound(baseForTax + taxAmount);

        // B. DETERMINE CORRECT PREFIX
        const hasTaxOrDisc = (taxRatePercent > 0 || totalDiscountNominal > 0 || gr.items.some(i => Number(i.discount || 0) > 0));
        let correctNumber = gr.receiptNumber;
        
        if (hasTaxOrDisc && gr.receiptNumber.startsWith("KB-LPB-")) {
            correctNumber = gr.receiptNumber.replace("KB-LPB-", "KB-LPBD-");
        } else if (!hasTaxOrDisc && gr.receiptNumber.startsWith("KB-LPBD-")) {
            correctNumber = gr.receiptNumber.replace("KB-LPBD-", "KB-LPB-");
        }

        // Handle Potential Conflict
        if (correctNumber !== gr.receiptNumber && allNumbers.has(correctNumber)) {
            correctNumber = `${correctNumber}-DUP`;
        }

        const needsUpdate = (
            Number(gr.subtotal) !== subtotal || 
            Number(gr.taxAmount) !== taxAmount || 
            Number(gr.grandTotal) !== grandTotal || 
            gr.receiptNumber !== correctNumber
        );

        if (needsUpdate) {
            console.log(`🔧 UPDATING GR: ${gr.receiptNumber} -> ${correctNumber} (Total: ${gr.grandTotal} -> ${grandTotal})`);
            
            await prisma.$transaction(async (tx) => {
                if (correctNumber !== gr.receiptNumber) {
                    await tx.stockMovement.updateMany({
                        where: { reference: gr.receiptNumber },
                        data: { reference: correctNumber }
                    });
                }

                await tx.goodsReceipt.update({
                    where: { id: gr.id },
                    data: {
                        receiptNumber: correctNumber,
                        subtotal: subtotal,
                        taxAmount: taxAmount,
                        grandTotal: grandTotal
                    }
                });
                
                allNumbers.delete(gr.receiptNumber);
                allNumbers.add(correctNumber);
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
        
        const baseForTax = subtotal - totalDiscountNominal;
        const taxAmount = Math.round(baseForTax * (taxRatePercent / 100));
        const grandTotal = smartRound(baseForTax + taxAmount);

        if (Number(sd.subtotal) !== subtotal || Number(sd.taxAmount) !== taxAmount || Number(sd.grandTotal) !== grandTotal) {
            console.log(`🔧 UPDATING SD: ${sd.deliveryNumber} (Total: ${sd.grandTotal} -> ${grandTotal})`);
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

    console.log("✅ Final Smart Synchronization Completed!");
}

syncFinal()
    .catch(e => {
        console.error("❌ Sync Failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
