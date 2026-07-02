import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const product = await prisma.product.findFirst({
    where: { barcode: '711844110021' }
  });
  
  if (!product) {
    console.log("Product not found by barcode 711844110021");
    return;
  }

  console.log("Product:", product.sku, product.name);

  const purchases = await prisma.goodsReceiptItem.findMany({
    where: { productId: product.id, receipt: { isVoid: false } },
    include: { receipt: true },
    orderBy: { receipt: { date: 'desc' } }
  });

  for (const p of purchases) {
    console.log(`Receipt: ${p.receipt.receiptNumber}, Date: ${p.receipt.date}, Qty: ${p.quantity}, Price: ${p.purchasePrice}`);
  }
}
main().finally(() => prisma.$disconnect());
