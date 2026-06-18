const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const gr = await prisma.goodsReceipt.findFirst({
        where: { receiptNumber: 'KB-LPBD-11062026-004' }
    });
    console.log(gr);
}
main().catch(console.error).finally(() => prisma.$disconnect());
