import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const saleItem = await prisma.salesDeliveryItem.findFirst({
    where: { delivery: { invoiceNumber: 'KB-TRD-01062026-004' }, product: { barcode: '8999999042974' } }
  });

  if (!saleItem) {
    console.log("Sale item not found");
    return;
  }
  
  console.log("Sale item found:", saleItem.id);

  const allocations = await prisma.lotAllocation.findMany({
    where: { sdItemId: saleItem.id }
  });

  console.log("Allocations:", allocations.length);
  for (const alloc of allocations) {
    const lot = await prisma.productLot.findUnique({
       where: { id: alloc.lotId }
    });
    if (lot) {
      const grItem = await prisma.goodsReceiptItem.findUnique({
        where: { id: lot.grItemId },
        include: { receipt: true }
      });
      console.log(`Lot GR: ${grItem?.receipt?.receiptNumber}, Qty: ${alloc.qty}`);
    }
  }
}
main().finally(() => prisma.$disconnect());
