const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const gr = await prisma.goodsReceipt.findFirst({
    where: { receiptNumber: 'KB-LPBD-17062026-002' },
    select: { createdAt: true, warehouseId: true }
  });
  const sd = await prisma.salesDelivery.findFirst({
    where: { invoiceNumber: 'KB-TRN-17062026-001' },
    select: { createdAt: true, warehouseId: true }
  });
  console.dir({ LPB: gr, SJ: sd }, { depth: null });
}
main().catch(console.error).finally(() => prisma.$disconnect());
