
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixOrderQuantity() {
  try {
    const orderNumber = "KB-PI-24042026-001";
    console.log(`--- Fixing Order: ${orderNumber} ---`);
    
    const order = await prisma.salesOrder.findUnique({
      where: { orderNumber },
      include: { items: true }
    });

    if (!order) {
      console.log("Order not found.");
      return;
    }

    // 1. Find all deliveries for this order
    const deliveries = await prisma.salesDelivery.findMany({
      where: { orderId: order.id, isVoid: false },
      include: { items: true }
    });

    console.log(`Found ${deliveries.length} deliveries.`);

    // 2. Reset shipped quantities for this order items
    for (const item of order.items) {
      const totalShipped = deliveries.reduce((sum, d) => {
        const matchingItems = d.items.filter(di => di.productId === item.productId);
        return sum + matchingItems.reduce((s, mi) => s + mi.quantity, 0);
      }, 0);

      console.log(`Product ${item.productId}: Calculated Total Shipped = ${totalShipped}`);

      await prisma.salesOrderItem.update({
        where: { id: item.id },
        data: { shippedQuantity: totalShipped }
      });

      await prisma.salesDeliveryItem.updateMany({
        where: { 
            delivery: { orderId: order.id },
            productId: item.productId,
            orderItemId: null 
        },
        data: { orderItemId: item.id }
      });
    }

    console.log("Fix complete.");

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

fixOrderQuantity();
