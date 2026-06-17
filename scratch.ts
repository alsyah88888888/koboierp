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
    where: {
      receiptNumber: {
        in: numbers
      }
    }
  });

  let total = 0;
  console.log("Rincian per dokumen:");
  for (const r of receipts) {
    const amount = Number(r.grandTotal);
    total += amount;
    console.log(`- ${r.receiptNumber}: Rp ${amount.toLocaleString('id-ID')}`);
  }

  const foundNumbers = receipts.map(r => r.receiptNumber);
  const notFound = numbers.filter(n => !foundNumbers.includes(n));

  if (notFound.length > 0) {
    console.log("\nDokumen tidak ditemukan:");
    notFound.forEach(n => console.log(`- ${n}`));
  }

  console.log(`\nTotal Keseluruhan: Rp ${total.toLocaleString('id-ID')}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
