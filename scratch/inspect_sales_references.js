const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const deliveries = await prisma.salesDelivery.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      deliveryNumber: true,
      invoiceNumber: true,
      salesPerson: true,
      buyerName: true,
      grandTotal: true
    }
  });
  console.log("RECENT DELIVERIES:");
  console.log(JSON.stringify(deliveries, null, 2));

  const orders = await prisma.salesOrder.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      orderNumber: true,
      invoiceNumber: true,
      salesPerson: true,
      buyerName: true,
      grandTotal: true
    }
  });
  console.log("RECENT ORDERS:");
  console.log(JSON.stringify(orders, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
