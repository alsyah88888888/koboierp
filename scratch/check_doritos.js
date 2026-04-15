
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDoritos() {
    const sku = "FOODORITOS-122";
    const product = await prisma.product.findUnique({
        where: { sku },
        include: {
            receiptItems: { include: { receipt: true } },
            salesItems: { include: { delivery: true } },
            movements: true
        }
    });

    if (!product) {
        console.log("Product not found");
        return;
    }

    console.log("Product:", product.name);
    console.log("\nReceipts (IN):");
    product.receiptItems.forEach(ri => {
        console.log(`- Ref: ${ri.receipt.receiptNumber}, Qty: ${ri.quantity}, Verified: ${ri.receipt.isVerified}`);
    });

    console.log("\nSales (OUT):");
    product.salesItems.forEach(si => {
        console.log(`- Ref: ${si.delivery.deliveryNumber}, Qty: ${si.quantity}`);
    });

    console.log("\nMovements (ADJ/Other):");
    product.movements.forEach(m => {
        console.log(`- Type: ${m.type}, Qty: ${m.quantity}, Ref: ${m.reference}`);
    });
}

checkDoritos().finally(() => prisma.$disconnect());
