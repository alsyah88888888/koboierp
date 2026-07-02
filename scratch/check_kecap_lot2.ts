import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const saleItem = await prisma.salesDeliveryItem.findFirst({
    where: { delivery: { invoiceNumber: 'KB-TRN-18062026-001' }, product: { name: { contains: 'Kecap' } } },
    include: {
      delivery: {
        include: { items: true }
      }
    }
  });

  if (saleItem) {
    console.log("Found item:", saleItem.id);
  }
}
main().finally(() => prisma.$disconnect());
