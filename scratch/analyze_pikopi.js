const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeProduct(sku) {
    try {
        console.log(`--- ANALYZING PRODUCT: ${sku} ---`);
        const product = await prisma.product.findUnique({
            where: { sku },
            include: {
                stocks: true,
                receiptItems: {
                    include: { receipt: true },
                    where: { receipt: { isVerified: true, isVoid: false } }
                },
                salesItems: {
                    include: { delivery: true },
                    where: { delivery: { isVoid: false } }
                }
            }
        });

        if (!product) {
            console.log("Product not found.");
            return;
        }

        console.log(`Name: ${product.name}`);
        console.log(`Current Stock Table Sum: ${product.stocks.reduce((acc, s) => acc + Number(s.quantity), 0)}`);

        console.log("\n--- PURCHASES (IN) ---");
        product.receiptItems.forEach(item => {
            console.log(`[${item.receipt.date.toISOString().split('T')[0]}] Qty: ${item.quantity} (Doc: ${item.receipt.formNumber || item.receipt.id})`);
        });

        console.log("\n--- SALES (OUT) ---");
        product.salesItems.forEach(item => {
            console.log(`[${item.delivery.date.toISOString().split('T')[0]}] Qty: ${item.quantity} (Doc: ${item.delivery.invoiceNumber || item.delivery.formNumber})`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

analyzeProduct("BEVPIKOPI-540");
