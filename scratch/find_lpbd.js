const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const query = "KB-LPBD-15042026-001";
  console.log("Searching for:", query);

  const ft = await prisma.financeTransaction.findMany({ where: { referenceNumber: { contains: query } } });
  console.log("FinanceTransaction:", ft);

  const pr = await prisma.purchaseRequest.findMany({ where: { number: { contains: query } } });
  console.log("PurchaseRequest:", pr);

  const gr = await prisma.goodsReceipt.findMany({ where: { receiptNumber: { contains: query } } });
  console.log("GoodsReceipt:", gr);

  const je = await prisma.journalEntry.findMany({ where: { description: { contains: query } } });
  console.log("JournalEntry:", je);
}

main().catch(console.error).finally(() => prisma.$disconnect());
