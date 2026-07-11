const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const targetDateStart = new Date('2026-07-11T00:00:00Z');
  const targetDateEnd = new Date('2026-07-11T23:59:59Z');

  console.log("=== Purchases (Goods Receipts) on 11 July 2026 ===");
  const grs = await prisma.goodsReceipt.findMany({
    where: {
      date: { gte: targetDateStart, lte: targetDateEnd }
    },
    include: {
      items: {
        include: {
          product: true
        }
      }
    }
  });
  console.log("Count:", grs.length);
  grs.forEach(gr => {
    console.log(`Receipt Number: ${gr.receiptNumber} | CreatedAt: ${gr.createdAt} | Date: ${gr.date} | Vendor: ${gr.receivedFrom}`);
    gr.items.forEach(item => {
      console.log(`  Item: ${item.product.sku} - Qty: ${item.quantity}`);
    });
  });

  console.log("\n=== Sales Deliveries on 11 July 2026 ===");
  const sds = await prisma.salesDelivery.findMany({
    where: {
      date: { gte: targetDateStart, lte: targetDateEnd }
    },
    include: {
      items: {
        include: {
          product: true,
          lotAllocations: {
            include: {
              lot: true
            }
          }
        }
      }
    }
  });
  console.log("Count:", sds.length);
  sds.forEach(sd => {
    console.log(`Delivery Number: ${sd.deliveryNumber} | CreatedAt: ${sd.createdAt} | Date: ${sd.date} | Buyer: ${sd.buyerName}`);
    sd.items.forEach(item => {
      console.log(`  Item: ${item.product.sku} - Qty: ${item.quantity}`);
      item.lotAllocations.forEach(alloc => {
        console.log(`    Allocation: Lot GR: ${alloc.lot.grNumber} | Lot GR Date: ${alloc.lot.grDate} | Alloc Qty: ${alloc.qty}`);
      });
    });
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
