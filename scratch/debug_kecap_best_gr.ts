import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const sale = await prisma.salesDeliveryItem.findFirst({
    where: { delivery: { deliveryNumber: 'KB-TRN-18062026-001' } },
    include: { product: true, delivery: true }
  });
  
  if (!sale) return;
  console.log("Sale Date:", sale.delivery.date);
  
  const purchases = await prisma.goodsReceiptItem.findMany({
    where: { productId: sale.productId, receipt: { isVoid: false } },
    include: { receipt: true },
    orderBy: { receipt: { date: 'asc' } }
  });

  const saleDateMs = sale.delivery.date.getTime();
  const saleQty = sale.quantity;
  
  let bestScore = -Infinity;
  let bestGR: any = null;

  for (const gr of purchases) {
    const grDate = gr.receipt.date;
    if (!grDate) continue;

    const daysDiff = Math.abs(saleDateMs - grDate.getTime()) / (1000 * 60 * 60 * 24);
    const saleDateDay = new Date(sale.delivery.date);
    saleDateDay.setHours(0, 0, 0, 0);
    const grDateDay = new Date(grDate);
    grDateDay.setHours(0, 0, 0, 0);
    
    const isBeforeSale = grDateDay.getTime() <= saleDateDay.getTime();
    const dateScore = isBeforeSale 
        ? Math.max(0, 100 - daysDiff * 0.5)
        : Math.max(0, 50 - daysDiff * 2);

    const qtyRatio = saleQty > 0 && gr.quantity > 0 
        ? Math.min(saleQty, gr.quantity) / Math.max(saleQty, gr.quantity) 
        : 0;
    const qtyScore = qtyRatio * 30;

    const totalScore = dateScore + qtyScore;
    
    console.log(`GR: ${gr.receipt.receiptNumber} (${grDate.toISOString().split('T')[0]}) -> daysDiff: ${daysDiff.toFixed(1)}, dateScore: ${dateScore.toFixed(1)}, qtyScore: ${qtyScore.toFixed(1)}, Total: ${totalScore.toFixed(1)}`);
    
    if (totalScore > bestScore) {
        bestScore = totalScore;
        bestGR = gr;
    }
  }
  
  console.log("WINNER:", bestGR?.receipt?.receiptNumber);
}
main().finally(() => prisma.$disconnect());
