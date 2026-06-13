const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const receipts = await prisma.goodsReceipt.findMany({ 
        where: { receiptNumber: { in: ['KB-LPB-13062026-001', 'KB-LPB-13062026-002', 'KB-LPB-13062026-003', 'KB-LPB-13062026-004'] } },
        select: { receiptNumber: true, formNumber: true }
    });
    console.log("Receipts:", JSON.stringify(receipts, null, 2));
}
main().finally(() => prisma.$disconnect());
