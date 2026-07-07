const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const delivery = await prisma.salesDelivery.findUnique({
    where: { deliveryNumber: 'SJ-425-12062026-020' },
    include: { items: { include: { product: true } } }
  });
  
  const sdItem = delivery.items[0];
  const sellPrice = Number(sdItem.salesPrice || 0);
  const itemDiscount = Number(sdItem.discount || 0);
  const qty = sdItem.quantity;
  
  const sdHeaderDiscount = Number(delivery.totalDiscount || 0);
  const sellLineSubtotal = sellPrice * qty - itemDiscount;
  const sdSubtotal = Number(delivery.subtotal || 0);
  const sdDiscountShare = sdSubtotal > 0 ? Math.round(sdHeaderDiscount * (sellLineSubtotal / sdSubtotal)) : 0;
  
  const totalSellDiscount = itemDiscount + sdDiscountShare;
  const dpp = Math.round((sellPrice * qty) - totalSellDiscount);
  
  const taxRate = Number(delivery.taxRate || 0);
  const ppn = Math.round(dpp * taxRate / 100);
  const totalJual = dpp + ppn;
  
  console.log({
    sellPrice, qty, sellLineSubtotal, sdSubtotal, totalSellDiscount, dpp, ppn, totalJual
  });
}
main().finally(() => prisma.$disconnect());
