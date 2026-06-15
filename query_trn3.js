const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const num = 'KB-TRN-28062026-005';
  const numContains = '28062026-005';

  const gr = await prisma.goodsReceipt.findFirst({
    where: { 
      OR: [
        { receiptNumber: num },
        { invoiceNumber: num },
        { receiptNumber: { contains: numContains } },
        { invoiceNumber: { contains: numContains } }
      ]
    }
  });

  const ft = await prisma.financeTransaction.findFirst({
    where: {
      OR: [
        { transactionNumber: num },
        { referenceNumber: num },
        { description: { contains: num } }
      ]
    }
  }).catch(() => null);

  const po = await prisma.purchaseOrder.findFirst({
    where: {
      OR: [
        { orderNumber: num },
        { orderNumber: { contains: numContains } }
      ]
    }
  });
  
  // also let's just search everything that has "isVoid" true on sales delivery
  const sdVoid = await prisma.salesDelivery.findFirst({
    where: {
      isVoid: true,
      OR: [
        { deliveryNumber: { contains: numContains } },
        { invoiceNumber: { contains: numContains } }
      ]
    }
  });

  console.dir({
    goodsReceipt: gr,
    financeTransaction: ft,
    purchaseOrder: po,
    voidedSalesDelivery: sdVoid
  }, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
