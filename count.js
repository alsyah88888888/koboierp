const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const products = await prisma.product.findMany({ include: { stocks: true } });
    console.log(`Products count: ${products.length}`);
    
    let totalStocks = 0;
    products.forEach(p => {
        totalStocks += p.stocks.length;
    });
    console.log(`Stocks count inside products: ${totalStocks}`);
    
    const unverifiedReceipts = await prisma.goodsReceipt.findMany({
        where: { isVerified: false, isVoid: false },
        include: { items: true }
    });
    console.log(`Unverified receipts: ${unverifiedReceipts.length}`);
    let rcptItems = 0;
    unverifiedReceipts.forEach(r => {
        rcptItems += r.items.length;
    });
    console.log(`Receipt items: ${rcptItems}`);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
