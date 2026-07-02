import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const sale = await prisma.salesDelivery.findUnique({
    where: { deliveryNumber: 'KB-TRN-06062026-002' }
  });
  console.log(sale);
}
main().finally(() => prisma.$disconnect());
