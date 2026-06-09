const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const products = await prisma.product.findMany({ 
        take: 5,
        where: { name: { contains: 'sunlight', mode: 'insensitive' } }
    });
    console.log(products.map(p => ({ sku: p.sku, name: p.name, purchasePrice: p.purchasePrice })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
