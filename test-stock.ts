import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const product = await prisma.product.findFirst({ where: { sku: 'BEVZODA-691' } });
    if (!product) return console.log('Product not found');
    
    const stocks = await prisma.stock.findMany({ where: { productId: product.id } });
    console.log('--- STOCKS ---');
    console.log(stocks);

    const lots = await prisma.productLot.findMany({ 
        where: { productId: product.id, isVoided: false, remainingQty: { gt: 0 } },
        select: { lotNumber: true, grNumber: true, initialQty: true, remainingQty: true, supplierName: true }
    });
    console.log('--- LOTS ---');
    console.log(lots);
}
main();
