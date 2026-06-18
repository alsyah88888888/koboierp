const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const delivery = await prisma.salesDelivery.findFirst({
    where: { invoiceNumber: 'KB-TRN-17062026-001' },
    include: {
      items: {
        include: {
          product: true,
          lotAllocations: true
        }
      }
    }
  });
  console.dir(delivery, { depth: null });
}
main().catch(console.error).finally(() => prisma.$disconnect());
