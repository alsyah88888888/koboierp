const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sd = await prisma.salesDelivery.findMany({
    where: { 
      OR: [
        { deliveryNumber: { contains: '01062026-003' } },
        { invoiceNumber: { contains: '01062026-003' } }
      ]
    },
    include: {
      items: {
        include: {
          product: true,
          lotAllocations: true
        }
      }
    }
  });
  console.dir(sd, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
