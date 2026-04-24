
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOrder() {
  try {
    const orderNumber = "KB-PI-22042026-003";
    console.log(`--- Checking Order: ${orderNumber} ---`);
    
    const order = await prisma.salesOrder.findFirst({
      where: { 
        OR: [
            { orderNumber: orderNumber },
            { proformaNumber: orderNumber }
        ]
      },
      include: { 
        items: { include: { product: true } },
        deliveries: { include: { items: true } }
      }
    });

    if (!order) {
      console.log("Order not found.");
      return;
    }

    console.log(`Order ID: ${order.id}`);
    console.log(`Status: ${order.status}`);
    console.log(`Buyer: ${order.buyerName}`);
    
    console.log("\nItems:");
    order.items.forEach(item => {
      console.log(`- SKU: ${item.product.sku}, Name: ${item.product.name}`);
      console.log(`  Ordered: ${item.quantity}, Shipped: ${item.shippedQuantity}, Remaining: ${item.quantity - item.shippedQuantity}`);
    });

    console.log("\nRelated Deliveries:");
    order.deliveries.forEach(d => {
      console.log(`SJ: ${d.deliveryNumber}, Date: ${d.date}, Void: ${d.isVoid}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrder();
