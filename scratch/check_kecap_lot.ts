import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const saleItem = await prisma.salesDeliveryItem.findFirst({
    where: { delivery: { invoiceNumber: 'KB-TRN-18062026-001' }, product: { name: { contains: 'Kecap' } } },
    include: {
      lotAllocations: {
        include: { lot: { include: { goodsReceiptItem: { include: { receipt: true } } } } }
      }
    }
  });

  if (saleItem) {
    console.log("Lot Allocations:", saleItem.lotAllocations.length);
    for (const alloc of saleItem.lotAllocations) {
      console.log(`Lot GR: ${alloc.lot?.goodsReceiptItem?.receipt?.receiptNumber}, Qty: ${alloc.qty}`);
    }
  }
}
main().finally(() => prisma.$disconnect());
