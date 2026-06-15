const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sd = await prisma.salesDelivery.findMany({
    where: { 
      invoiceNumber: { contains: '28052026' }
    }
  });

  console.dir({
    salesDelivery: sd.map(s => s.invoiceNumber)
  }, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
