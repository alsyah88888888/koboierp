const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const products = await prisma.product.findMany({ take: 5 });
  console.log(products.map(p => p.name));
}
run();
