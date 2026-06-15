const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sds = await prisma.salesDelivery.findMany({
    where: { 
      OR: [
        { deliveryNumber: { contains: '01062026-003' } },
        { invoiceNumber: { contains: '01062026-003' } },
        { deliveryNumber: { contains: '003' } }
      ]
    },
    take: 10,
    orderBy: { date: 'desc' }
  });
  
  const results = sds.map(sd => ({
    id: sd.id,
    deliveryNumber: sd.deliveryNumber,
    invoiceNumber: sd.invoiceNumber,
    date: sd.date
  }));
  
  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
