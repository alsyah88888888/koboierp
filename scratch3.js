const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const grs = await prisma.goodsReceiptItem.findMany({
    where: { product: { name: { contains: 'NESTLE MILO CEREAL' } } },
    include: { receipt: true }
  });
  console.dir(grs, { depth: null });
}
main().catch(console.error).finally(() => prisma.$disconnect());
