const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const receipts = await prisma.goodsReceipt.findMany({ 
        where: { createdById: 'cmqbtm6mw00ayl1jw1pops10h' },
        include: { items: true, verifications: true }
    });
    console.log(JSON.stringify(receipts, null, 2));
}
main().finally(() => prisma.$disconnect());
