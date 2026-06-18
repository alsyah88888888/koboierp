const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const items = await prisma.goodsReceiptItem.findMany({
        where: { purchasePrice: { gt: 167000, lt: 168000 } }
    });
    console.log(items);
}
main().catch(console.error).finally(() => prisma.$disconnect());
