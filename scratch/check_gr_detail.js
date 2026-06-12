const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const gr = await prisma.goodsReceipt.findUnique({
    where: { receiptNumber: "KB-LPBD-10062026-012" },
    include: {
      items: {
        include: {
          product: true
        }
      }
    }
  });

  if (!gr) {
    console.log("Goods Receipt not found");
    return;
  }

  console.log(`=== GR DETAIL FOR KB-LPBD-10062026-012 ===`);
  console.log(`Supplier: ${gr.receivedFrom}`);
  console.log(`Date: ${gr.date.toISOString()}`);
  gr.items.forEach(item => {
    console.log(`- ${item.product.name} (SKU: ${item.product.sku}) | Qty: ${item.quantity} | Purchase Price: Rp ${Number(item.purchasePrice).toLocaleString('id-ID')}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
