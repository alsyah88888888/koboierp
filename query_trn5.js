const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sd = await prisma.salesDelivery.findMany({
    where: { 
      OR: [
        { invoiceNumber: { contains: '28052026-005' } },
        { invoiceNumber: { contains: '28062026' } },
        { invoiceNumber: { contains: '005' } },
        { deliveryNumber: { contains: '28062026' } }
      ]
    },
    take: 10,
    orderBy: { date: 'desc' }
  });

  const so = await prisma.salesOrder.findMany({
    where: { 
      OR: [
        { orderNumber: { contains: '28052026-005' } },
        { orderNumber: { contains: '28062026' } }
      ]
    }
  });
  
  console.dir({
    salesDelivery: sd.map(s => s.invoiceNumber),
    salesOrder: so.map(s => s.orderNumber)
  }, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
