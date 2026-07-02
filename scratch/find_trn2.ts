import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const sale = await prisma.salesDelivery.findFirst({
    where: { 
      invoiceNumber: { contains: 'KB-TRN-06062026-002' }
    }
  });
  console.log("By invoiceNumber:", sale?.deliveryNumber, sale?.invoiceNumber, sale?.createdAt);
}
main().finally(() => prisma.$disconnect());
