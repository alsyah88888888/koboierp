import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const saleItem = await prisma.salesDeliveryItem.findFirst({
    where: { delivery: { invoiceNumber: 'KB-TRN-18062026-001' }, product: { name: { contains: 'Kecap' } } }
  });

  if (saleItem) {
    const allocations = await prisma.salesDeliveryLot.findMany({
      where: { salesDeliveryItemId: saleItem.id },
      include: { lot: { include: { goodsReceiptItem: { include: { receipt: true } } } } }
    });
    console.log("Allocations:", allocations.length);
    for (const alloc of allocations) {
      console.log(`Lot GR: ${alloc.lot?.goodsReceiptItem?.receipt?.receiptNumber}, Qty: ${alloc.qty}`);
    }
  }
}
main().finally(() => prisma.$disconnect());
