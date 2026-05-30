const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    console.log('Searching for Product containing SO KLIN...');
    const products = await prisma.product.findMany({
      where: {
        name: {
          contains: 'SO KLIN',
          mode: 'insensitive'
        }
      }
    });
    console.log('PRODUCTS FOUND:', products);

    for (const p of products) {
      console.log(`\n=================== PRODUCT: ${p.name} (${p.id}) ===================`);
      
      console.log('--- Lots in ProductLot ---');
      const lots = await prisma.productLot.findMany({
        where: { productId: p.id },
        orderBy: { grDate: 'asc' }
      });
      console.log(lots);

      console.log('--- GoodsReceiptItem ---');
      const grItems = await prisma.goodsReceiptItem.findMany({
        where: { productId: p.id },
        include: {
          receipt: true
        }
      });
      console.log(grItems.map(item => ({
        id: item.id,
        receiptNumber: item.receipt.receiptNumber,
        receivedFrom: item.receipt.receivedFrom,
        quantity: item.quantity,
        purchasePrice: item.purchasePrice,
        discount: item.discount,
        uom: item.uom,
        date: item.receipt.date,
        isVoid: item.receipt.isVoid,
        totalDiscount: item.receipt.totalDiscount,
        subtotal: item.receipt.subtotal,
        grandTotal: item.receipt.grandTotal
      })));

      console.log('--- LotAllocations/Sales ---');
      const lotAllocations = await prisma.lotAllocation.findMany({
        where: {
          lot: {
            productId: p.id
          }
        },
        include: {
          lot: true,
          sdItem: {
            include: {
              delivery: true
            }
          }
        }
      });
      console.log(lotAllocations.map(a => ({
        lotNumber: a.lot.lotNumber,
        grNumber: a.lot.grNumber,
        sdNumber: a.sdItem.delivery.deliveryNumber,
        qty: a.qty,
        hppAtTime: a.hppAtTime,
        salesPrice: a.sdItem.salesPrice
      })));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
