const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  const voidedReceipts = await prisma.goodsReceipt.findMany({ where: { isVoid: true } });
  for (const r of voidedReceipts) {
    const res = await prisma.journalEntry.deleteMany({
      where: { description: { contains: r.receiptNumber } }
    });
    if (res.count > 0) console.log(`Deleted ${res.count} journals for voided receipt ${r.receiptNumber}`);
  }

  const voidedDeliveries = await prisma.salesDelivery.findMany({ where: { isVoid: true } });
  for (const d of voidedDeliveries) {
    const res = await prisma.journalEntry.deleteMany({
      where: { description: { contains: d.deliveryNumber } }
    });
    if (res.count > 0) console.log(`Deleted ${res.count} journals for voided delivery ${d.deliveryNumber}`);
  }
}

cleanup().catch(console.error).finally(() => prisma.$disconnect());
