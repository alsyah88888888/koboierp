const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const delivery = await prisma.salesDelivery.findUnique({
    where: { deliveryNumber: 'SJ-425-12062026-020' },
    include: { items: { include: { lotAllocations: { include: { lot: true } } } } }
  });
  
  console.log(JSON.stringify(delivery.items[0].lotAllocations, null, 2));
}
main().finally(() => prisma.$disconnect());
