const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const receipts = await prisma.goodsReceipt.findMany({
        where: { isVoid: false },
        include: { items: true }
    });
    console.log(`Receipts: ${receipts.length}`);
    let rcptItems = 0;
    receipts.forEach(r => {
        rcptItems += r.items.length;
    });
    console.log(`Receipt items: ${rcptItems}`);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
