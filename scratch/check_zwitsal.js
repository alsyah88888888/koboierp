
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkZwitsal() {
    const sku = "BABYZWITSAL-999";
    const product = await prisma.product.findUnique({
        where: { sku },
        include: {
            receiptItems: { include: { receipt: true } },
            stocks: true
        }
    });

    if (!product) {
        console.log("Product not found");
        return;
    }

    console.log("Product:", product.name);
    console.log("\nReceipt History (LPB):");
    if (product.receiptItems.length === 0) {
        console.log("- No Goods Receipt records found for this product.");
    } else {
        product.receiptItems.forEach(ri => {
            console.log(`- Ref: ${ri.receipt.receiptNumber}, Qty: ${ri.quantity}, Verified: ${ri.receipt.isVerified}, Date: ${ri.receipt.createdAt}`);
        });
    }

    console.log("\nCurrent Stock Table:");
    product.stocks.forEach(s => {
        console.log(`- Warehouse ID: ${s.warehouseId}, Vendor: ${s.vendorName}, Qty: ${s.quantity}`);
    });
}

checkZwitsal().finally(() => prisma.$disconnect());
