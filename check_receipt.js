const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDetails() {
    const receipt = await prisma.goodsReceipt.findUnique({
        where: { receiptNumber: 'KB-LPB-20260324-001' }
    });
    console.log("RECEIPT:", JSON.stringify(receipt, null, 2));
}

checkDetails().catch(console.error).finally(() => prisma.$disconnect());
