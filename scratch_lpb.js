const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const gr = await prisma.goodsReceipt.findFirst({
    where: { receiptNumber: 'KB-LPBD-17062026-002' },
    include: {
      items: {
        include: { product: true }
      }
    }
  });
  console.dir(gr, { depth: null });
}
main().catch(console.error).finally(() => prisma.$disconnect());
