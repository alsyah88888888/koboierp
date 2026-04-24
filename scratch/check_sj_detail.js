
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSJ() {
  try {
    const sjNumber = "KB-TRN-24042026-004";
    console.log(`--- Checking SJ: ${sjNumber} ---`);
    
    const sj = await prisma.salesDelivery.findUnique({
      where: { deliveryNumber: sjNumber },
      include: { items: { include: { product: true } } }
    });

    if (!sj) {
      console.log("SJ not found.");
      return;
    }

    console.log(`SJ ID: ${sj.id}, Order ID: ${sj.orderId}`);
    sj.items.forEach(item => {
      console.log(`- SKU: ${item.product.sku}, Qty: ${item.quantity}, OrderItemId: ${item.orderItemId}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkSJ();
