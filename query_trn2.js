const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const numberToFind = 'KB-TRN-28062026-005';
  
  const sdDelivery = await prisma.salesDelivery.findFirst({
    where: { deliveryNumber: numberToFind }
  });
  
  const sdInvoice = await prisma.salesDelivery.findFirst({
    where: { invoiceNumber: numberToFind }
  });

  const so = await prisma.salesOrder.findFirst({
    where: { orderNumber: numberToFind }
  });

  const sr = await prisma.salesReturn.findFirst({
    where: { returnNumber: numberToFind }
  });

  const sdDeliveryContains = await prisma.salesDelivery.findMany({
    where: { deliveryNumber: { contains: '28062026-005' } }
  });

  const sdInvoiceContains = await prisma.salesDelivery.findMany({
    where: { invoiceNumber: { contains: '28062026-005' } }
  });
  
  console.dir({
    exactDelivery: sdDelivery,
    exactInvoice: sdInvoice,
    exactOrder: so,
    exactReturn: sr,
    containsDelivery: sdDeliveryContains,
    containsInvoice: sdInvoiceContains
  }, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
