const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const num = 'KB-TRN-28052026-005';

  const ft = await prisma.financeTransaction.findMany({
    where: {
      OR: [
        { invoiceNumber: { contains: num } },
        { referenceNumber: { contains: num } },
        { description: { contains: num } }
      ]
    }
  });

  console.dir(ft, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
