const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const receipts = await prisma.goodsReceipt.findMany({
        where: { isVoid: false },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        take: 5
    });
    console.log(JSON.stringify(receipts.map(r => r.items.map(i => i.purchasePrice)), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
