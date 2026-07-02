import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const grs = await prisma.goodsReceiptItem.findMany({
    where: { 
      product: { sku: 'PERELLIPS-149' },
      receipt: { isVoid: false }
    }
  });
  const prices = grs.map(gr => Number(gr.purchasePrice));
  prices.sort((a, b) => a - b);
  console.log("Prices for PERELLIPS-149:", prices);
  let median = 0;
  if (prices.length > 0) {
    const mid = Math.floor(prices.length / 2);
    median = prices.length % 2 === 0 ? (prices[mid - 1] + prices[mid]) / 2 : prices[mid];
  }
  console.log("Median:", median);
}
main().finally(() => prisma.$disconnect());
