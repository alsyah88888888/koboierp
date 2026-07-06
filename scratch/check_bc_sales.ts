import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const bcSales = await prisma.salesDelivery.findMany({
    where: { salesPerson: 'BC' },
    include: { items: true },
    orderBy: { date: 'desc' },
    take: 5
  });
  console.log(JSON.stringify(bcSales, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
