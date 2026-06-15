const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const num = 'KB-TRN-28062026-005';

  const sd = await prisma.salesDelivery.findMany({
    where: { 
      OR: [
        { invoiceNumber: { contains: num } },
        { deliveryNumber: { contains: num } }
      ]
    }
  });

  const so = await prisma.salesOrder.findMany({
    where: { 
      OR: [
        { orderNumber: { contains: num } }
      ]
    }
  });

  console.dir({
    salesDelivery: sd,
    salesOrder: so
  }, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
