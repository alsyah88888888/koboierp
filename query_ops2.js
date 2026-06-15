const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sd = await prisma.salesDelivery.findFirst({
    where: { invoiceNumber: 'KB-TRN-28052026-005' },
    select: { salesPerson: true, isVoid: true, paymentStatus: true, date: true }
  });

  console.dir({ salesDelivery: sd }, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
