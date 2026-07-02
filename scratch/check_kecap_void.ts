import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const purchases = await prisma.goodsReceiptItem.findMany({
    where: { product: { barcode: '711844110021' } },
    include: { receipt: true },
    orderBy: { receipt: { date: 'desc' } }
  });

  for (const p of purchases) {
    if (p.receipt.date > new Date('2026-03-24') && p.receipt.date < new Date('2026-06-19')) {
       console.log(`Receipt: ${p.receipt.receiptNumber}, Date: ${p.receipt.date}, isVoid: ${p.receipt.isVoid}, Price: ${p.purchasePrice}`);
    }
  }
}
main().finally(() => prisma.$disconnect());
