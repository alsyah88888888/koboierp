import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const numbers = [
    'KB-LPBD-10062026-004',
    'KB-LPBD-10062026-005',
    'KB-LPBD-10062026-003',
    'KB-LPBD-10062026-013',
    'KB-LPBD-10062026-009',
    'KB-LPBD-10062026-006'
  ];

  const receipts = await prisma.goodsReceipt.findMany({
    where: { receiptNumber: { in: numbers } },
    select: { receiptNumber: true, salesPerson: true, grandTotal: true }
  });
  console.log(receipts);
}

main().catch(console.error).finally(() => prisma.$disconnect());
