
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOrder() {
  try {
    const proformaNumber = "KB-PI-24042026-001";
    console.log(`--- Checking Order: ${proformaNumber} ---`);
    
    const order = await prisma.salesOrder.findUnique({
      where: { proformaNumber },
      include: { items: { include: { product: true } } }
    });

    if (!order) {
      console.log("Order not found.");
      return;
    }

    console.log(`Order Status: ${order.status}`);
    console.log("Items:");
    order.items.forEach(item => {
      console.log(`- SKU: ${item.product.sku}, Qty: ${item.quantity}, Shipped: ${item.shippedQuantity}, Remaining: ${item.quantity - item.shippedQuantity}`);
    });

    console.log(`\n--- Checking Deliveries for this Order ---`);
    const deliveries = await prisma.salesDelivery.findMany({
      where: { orderId: order.id },
      include: { items: { include: { product: true } } }
    });

    deliveries.forEach(d => {
      console.log(`SJ: ${d.deliveryNumber}, Date: ${d.date}`);
      d.items.forEach(di => {
        console.log(`  - ${di.product.sku}: ${di.quantity} (Vendor: ${di.vendorName}, OrderItemId: ${di.orderItemId})`);
      });
    });

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrder();
