import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const gr1 = await prisma.goodsReceipt.findUnique({
    where: { receiptNumber: 'KB-LPBD-18052026-001' }
  });
  const gr2 = await prisma.goodsReceipt.findUnique({
    where: { receiptNumber: 'KB-LPBD-06062026-003' }
  });
  
  const sale = await prisma.salesDelivery.findUnique({
    where: { deliveryNumber: 'KB-TRN-06062026-002' }
  });

  console.log("GR 1 (18/05) date:", gr1?.date);
  console.log("GR 2 (06/06) date:", gr2?.date);
  console.log("Sale (06/06) date:", sale?.date);
}
main().finally(() => prisma.$disconnect());
