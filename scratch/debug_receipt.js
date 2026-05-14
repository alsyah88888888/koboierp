const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const receipt = await prisma.goodsReceipt.findFirst({
        where: { receiptNumber: 'KB-LPBD-12052026-005' },
        include: { items: true }
    });
    console.log(JSON.stringify(receipt, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
