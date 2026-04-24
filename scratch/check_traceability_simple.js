
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    const sku = "FOOKHONG-378";
    const deliveryNumber = "KB-TRD-26012026-005";

    console.log(`--- Checking Sale: ${deliveryNumber} for SKU: ${sku} ---`);
    const saleItem = await prisma.salesDeliveryItem.findFirst({
      where: {
        delivery: { deliveryNumber },
        product: { sku }
      },
      include: { delivery: true, product: true }
    });

    if (!saleItem) {
      console.log("Sale item not found.");
    } else {
      console.log("Sale Item Details:");
      console.log(`- Qty: ${saleItem.quantity}`);
      console.log(`- VendorName in DB: "${saleItem.vendorName}"`);
      console.log(`- Delivery Date: ${saleItem.delivery.date}`);
    }

    console.log(`\n--- Checking Purchase History (Receipts) for SKU: ${sku} ---`);
    const product = await prisma.product.findUnique({ where: { sku } });
    if (!product) {
        console.log("Product not found.");
        return;
    }

    const receipts = await prisma.goodsReceiptItem.findMany({
      where: { productId: product.id },
      include: { receipt: true },
      orderBy: { receipt: { date: 'asc' } }
    });

    console.log("Receipts found:");
    receipts.forEach((ri) => {
      console.log(`- Date: ${ri.receipt.date}, Supplier: "${ri.receipt.receivedFrom}", Qty: ${ri.quantity}, GR: ${ri.receipt.receiptNumber}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
