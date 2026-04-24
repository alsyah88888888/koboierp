
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findOrder() {
  try {
    const query = "24042026-001";
    console.log(`--- Searching for any Order with: ${query} ---`);
    
    const orders = await prisma.salesOrder.findMany({
      where: {
        OR: [
          { orderNumber: { contains: query } },
          { proformaNumber: { contains: query } }
        ]
      },
      include: { items: { include: { product: true } } }
    });

    if (orders.length === 0) {
      console.log("No orders found with that number.");
      // Search all orders to see naming convention
      const recent = await prisma.salesOrder.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
      console.log("Recent orders:", recent.map(r => ({ order: r.orderNumber, pi: r.proformaNumber })));
      return;
    }

    orders.forEach(order => {
        console.log(`Found Order ID: ${order.id}`);
        console.log(`Order Number: ${order.orderNumber}`);
        console.log(`PI Number: ${order.proformaNumber}`);
        console.log(`Status: ${order.status}`);
        order.items.forEach(item => {
            console.log(`- SKU: ${item.product.sku}, Qty: ${item.quantity}, Shipped: ${item.shippedQuantity}`);
        });
    });

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

findOrder();
