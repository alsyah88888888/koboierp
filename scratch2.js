const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const prod = await prisma.product.findFirst({
    where: { name: { contains: 'NESTLE MILO CEREAL' } },
  });
  console.dir(prod, { depth: null });
}
main().catch(console.error).finally(() => prisma.$disconnect());
