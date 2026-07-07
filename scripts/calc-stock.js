const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const stocks = await prisma.stock.findMany({
      include: { product: true }
  });
  
  // Also get the latest GR items to get HPP
  const recentReceipts = await prisma.goodsReceipt.findMany({
      where: { isVoid: false },
      include: { items: true },
      orderBy: { createdAt: 'desc' }
  });

  const getStockHPP = (productId, vendorName) => {
      const matchingReceipt = recentReceipts.find(r => 
          (r.receivedFrom || "CIBINONG").trim().toLowerCase() === (vendorName || "CIBINONG").trim().toLowerCase() && 
          r.items?.some(item => item.productId === productId)
      );
      const matchingItem = matchingReceipt?.items?.find(item => item.productId === productId);
      return matchingItem?.purchasePrice ? Number(matchingItem.purchasePrice) : 0;
  };

  let totalValue = 0;
  stocks.forEach(s => {
      let hpp = getStockHPP(s.productId, s.vendorName);
      if (!hpp || hpp === 0) hpp = Number(s.product.purchasePrice || 0);
      totalValue += (s.quantity * hpp);
  });
  console.log("Total Stock Value:", totalValue);
}
run();
