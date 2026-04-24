
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllDeliveries() {
  try {
    const orderId = "cmocsh3ih00aal1a35odm2ry0"; // From previous script
    console.log(`--- Checking All Deliveries for Order ID: ${orderId} ---`);
    
    const deliveries = await prisma.salesDelivery.findMany({
      where: { orderId: orderId },
      include: { items: { include: { product: true } } }
    });

    deliveries.forEach(d => {
      console.log(`SJ: ${d.deliveryNumber} (ID: ${d.id})`);
      d.items.forEach(di => {
        console.log(`  - ${di.product.sku}: ${di.quantity}, OrderItemId: ${di.orderItemId}`);
      });
    });

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllDeliveries();
