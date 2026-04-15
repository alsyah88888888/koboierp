const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFullAudit() {
    try {
        console.log("Starting full audit test...");
        const products = await prisma.product.findMany({
            select: { id: true, sku: true, name: true, purchasePrice: true, stocks: { select: { quantity: true } } }
        });
        console.log(`Products found: ${products.length}`);

        const purchasedAgg = await prisma.goodsReceiptItem.groupBy({
            by: ['productId'],
            where: { receipt: { isVerified: true, isVoid: false } },
            _sum: { quantity: true }
        });
        console.log(`Purchased count: ${purchasedAgg.length}`);

        const soldAgg = await prisma.salesDeliveryItem.groupBy({
            by: ['productId'],
            where: { delivery: { isVoid: false } },
            _sum: { quantity: true }
        });
        console.log(`Sold count: ${soldAgg.length}`);

        const auditData = products.map(p => {
             const currentStock = p.stocks.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);
             return { id: p.id, sku: p.sku, name: p.name, currentStock };
        });

        console.log(`Final map size: ${auditData.length}`);
        if (auditData.length > 0) {
            console.log("First item sample:", JSON.stringify(auditData[0]));
        }

    } catch (err) {
        console.error("Audit test error:", err);
    } finally {
        await prisma.$disconnect();
    }
}

testFullAudit();
