import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 1. Get the sale item
  const saleItem = await prisma.salesDeliveryItem.findFirst({
    where: { delivery: { invoiceNumber: 'KB-TRN-18062026-001' }, product: { name: { contains: 'Kecap' } } },
    include: { lotAllocations: true }
  });

  if (!saleItem) {
    console.log("Sale item not found");
    return;
  }
  
  // 2. Find the target GR lot (KB-LPBD-17062026-004)
  const targetGR = await prisma.goodsReceiptItem.findFirst({
    where: { receipt: { receiptNumber: 'KB-LPBD-17062026-004' }, productId: saleItem.productId },
    include: { receipt: true }
  });

  if (!targetGR) {
    console.log("Target GR not found");
    return;
  }
  
  const targetLot = await prisma.productLot.findUnique({
    where: { grItemId: targetGR.id }
  });
  
  if (!targetLot) {
    console.log("Target Lot not found");
    return;
  }

  // 3. Delete existing lot allocation(s) for this sale item
  await prisma.lotAllocation.deleteMany({
    where: { sdItemId: saleItem.id }
  });
  
  // 4. Create new lot allocation to point to KB-LPBD-17062026-004
  await prisma.lotAllocation.create({
    data: {
      sdItemId: saleItem.id,
      lotId: targetLot.id,
      qty: 500,
      hppAtTime: targetLot.purchasePrice
    }
  });

  console.log("SUCCESS! Lot Allocation updated to point to KB-LPBD-17062026-004.");
}
main().finally(() => prisma.$disconnect());
