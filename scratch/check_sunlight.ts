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
    where: { sdItemId: saleItem.id },
    include: { lot: { include: { goodsReceiptItem: { include: { receipt: true } } } } }
  });

  console.log("Allocations:", allocations.length);
  for (const alloc of allocations) {
    console.log(`Lot GR: ${alloc.lot?.goodsReceiptItem?.receipt?.receiptNumber}, Qty: ${alloc.qty}`);
  }
}
main().finally(() => prisma.$disconnect());
