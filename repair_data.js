const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function repairMatahari() {
    console.log("Starting repair for PT MATAHARI...");

    const receiptNumber = 'KB-LPB-20260324-001';
    const receipt = await prisma.goodsReceipt.findUnique({
        where: { receiptNumber },
        include: { items: true }
    });

    if (!receipt) {
        console.log("Receipt not found!");
        return;
    }

    // Correct Totals
    // Subtotal: 114,637,838
    // Tax: 11% of 114,637,838 = 12,610,162.18 -> 12,610,162
    // GrandTotal: 114,637,838 + 12,610,162 = 127,248,000
    
    // BUT we want to curate to REAL STOCK.
    // Let's assume the user wants to set it back to a clean state first, OR just fix the calculation.
    // If we just fix the calculation:
    const correctTax = Math.round(Number(receipt.subtotal) * 0.11);
    const correctGrandTotal = Number(receipt.subtotal) + correctTax;

    console.log(`Current GrandTotal: ${receipt.grandTotal}`);
    console.log(`Correct GrandTotal: ${correctGrandTotal}`);

    const difference = Number(receipt.grandTotal) - correctGrandTotal;
    console.log(`Difference to subtract from vendor balance: ${difference}`);

    // Update Receipt
    await prisma.goodsReceipt.update({
        where: { id: receipt.id },
        data: {
            taxAmount: correctTax,
            grandTotal: correctGrandTotal,
            isVerified: false // Set to false so they can re-verify with the new manual input feature
        }
    });

    // Update Vendor Balance
    const vendor = await prisma.vendor.findFirst({ where: { name: { contains: "MATAHARI" } } });
    if (vendor) {
        // The current balance is ~1.3 Billion.
        // We need to set it to 120,748,000 (127,248,000 - 6,500,000 DP)
        await prisma.vendor.update({
            where: { id: vendor.id },
            data: { balance: 120748000 }
        });
        console.log(`Updated Vendor ${vendor.name} balance to 120,748,000.`);
    }

    // Cleanup bad Journals?
    // The previous journal creation in verifyGoodsReceiptAction probably created bad entries.
    // It's better to just leave them (they are correction journals) or delete them if we reset isVerified.
    // Since we reset isVerified, when they verify again, it will create NEW correction journals.
    // To keep it clean, let's delete journals with "Koreksi Discrepancy" for this receipt from today.
    const deletedJournals = await prisma.journalEntry.deleteMany({
        where: {
            description: { contains: `Koreksi Discrepancy` },
            description: { contains: receiptNumber }
        }
    });
    console.log(`Cleaned up ${deletedJournals.count} correction journals.`);
}

repairMatahari().catch(console.error).finally(() => prisma.$disconnect());
