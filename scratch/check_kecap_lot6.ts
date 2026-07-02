import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const saleItem = await prisma.salesDeliveryItem.findFirst({
    where: { delivery: { invoiceNumber: 'KB-TRN-18062026-001' }, product: { name: { contains: 'Kecap' } } }
  });

  if (saleItem) {
    const allocations = await prisma.lotAllocation.findMany({
      where: { sdItemId: saleItem.id },
      include: { lot: true }
    });
    console.log("Allocations:", allocations.length);
    for (const alloc of allocations) {
      const grItem = await prisma.goodsReceiptItem.findUnique({
        where: { id: alloc.lot.grItemId },
        include: { receipt: true }
      });
      console.log(`Lot GR: ${grItem?.receipt?.receiptNumber}, Qty: ${alloc.qty}`);
    }
  }
}
main().finally(() => prisma.$disconnect());
