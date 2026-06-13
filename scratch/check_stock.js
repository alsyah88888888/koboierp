const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const stocks = await prisma.stock.findMany({ 
        where: { vendorName: 'Hypermart - Cyberpark Karawaci LKU' }
    });
    console.log("Stocks:", JSON.stringify(stocks, null, 2));
}
main().finally(() => prisma.$disconnect());
