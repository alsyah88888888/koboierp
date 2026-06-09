const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const products = await prisma.product.findMany({ include: { stocks: true } });
    
    const data = products.flatMap(p => 
        p.stocks.map(s => ({
            id: s.id,
            sku: p.sku
        }))
    );
    console.log(`Export array length: ${data.length}`);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
