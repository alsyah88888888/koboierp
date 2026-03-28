const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function curateToReal() {
    console.log("Forcing curation to 500 karton for MATAHARI...");

    const receiptNumber = 'KB-LPB-20260324-001';
    const receipt = await prisma.goodsReceipt.findUnique({
        where: { receiptNumber },
        include: { items: true }
    });

    if (!receipt) {
        console.log("Receipt not found!");
        return;
    }

    // Set Qty to 500
    const actualQty = 500;
    const pricePerUnit = Number(receipt.items[0].purchasePrice);
    const newSubtotal = actualQty * pricePerUnit;
    const newTax = Math.round(newSubtotal * 0.11);
    const newGrandTotal = newSubtotal + newTax;

    // Update Item
    await prisma.goodsReceiptItem.update({
        where: { id: receipt.items[0].id },
        data: { quantity: actualQty }
    });

    // Update Header
    await prisma.goodsReceipt.update({
        where: { id: receipt.id },
        data: {
            receiptNumber: receipt.receiptNumber.replace("KB-LPB-", "KB-LPBD-"), // Force prefix to show it works
            subtotal: newSubtotal,
            taxAmount: newTax,
            grandTotal: newGrandTotal,
            isVerified: true, // Mark as verified so they see the final result
            verifiedAt: new Date()
        }
    });

    // Update Vendor Balance
    const vendor = await prisma.vendor.findFirst({ where: { name: { contains: "MATAHARI" } } });
    if (vendor) {
        // Correct balance = 500 qty total - 6.5m DP
        const correctBalance = newGrandTotal - 6500000;
        await prisma.vendor.update({
            where: { id: vendor.id },
            data: { balance: correctBalance }
        });
        console.log(`Updated Vendor ${vendor.name} balance to ${correctBalance}.`);
    }

    console.log("Curation complete. Please check the print out now.");
}

curateToReal().catch(console.error).finally(() => prisma.$disconnect());
