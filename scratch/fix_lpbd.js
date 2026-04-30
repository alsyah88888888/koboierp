const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  const query = "KB-LPBD-15042026-001";
  console.log("Fixing:", query);

  const deletedJournals = await prisma.journalEntry.deleteMany({
    where: { description: { contains: query }, transactionId: null }
  });
  console.log("Deleted Journals:", deletedJournals.count);

  const gr = await prisma.goodsReceipt.update({
    where: { receiptNumber: query },
    data: {
      paymentStatus: 'PENDING',
      paidAmount: 0
    }
  });
  console.log("Updated GoodsReceipt:", gr.receiptNumber, gr.paymentStatus);
}

fix().catch(console.error).finally(() => prisma.$disconnect());
