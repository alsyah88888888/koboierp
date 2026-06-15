const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sd = await prisma.salesDelivery.findUnique({
    where: { id: 'cmpw19agn0008l1d8wxmb4mys' },
    include: {
      items: {
        include: {
          product: { select: { sku: true, name: true } }
        }
      }
    }
  });
  
  console.log(JSON.stringify(sd, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
