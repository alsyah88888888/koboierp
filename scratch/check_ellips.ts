import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const gr1 = await prisma.goodsReceipt.findUnique({
    where: { receiptNumber: 'KB-LPBD-18052026-001' },
    include: { items: { include: { product: true } } }
  });
  const gr2 = await prisma.goodsReceipt.findUnique({
    where: { receiptNumber: 'KB-LPBD-06062026-003' },
    include: { items: { include: { product: true } } }
  });

  console.log("KB-LPBD-18052026-001 items:");
  gr1?.items.filter(i => i.product.barcode === '8993417200076' || i.product.sku.includes('Ellips')).forEach(i => console.log(i.product.sku, i.purchasePrice, i.quantity));

  console.log("KB-LPBD-06062026-003 items:");
  gr2?.items.filter(i => i.product.barcode === '8993417200076' || i.product.sku.includes('Ellips') || i.product.name.includes('Ellips')).forEach(i => console.log(i.product.sku, i.purchasePrice, i.quantity));
}
main().finally(() => prisma.$disconnect());
