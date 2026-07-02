import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const sale = await prisma.salesDelivery.findFirst({
    where: { 
      deliveryNumber: { contains: 'KB-TRN-06062026-002' }
    }
  });
  console.log("By deliveryNumber:", sale?.deliveryNumber, sale?.createdAt);
  
  if (!sale) {
    const sale2 = await prisma.salesOrder.findFirst({
      where: { orderNumber: { contains: 'KB-TRN-06062026-002' } }
    });
    console.log("By orderNumber:", sale2?.orderNumber, sale2?.createdAt);
  }
}
main().finally(() => prisma.$disconnect());
