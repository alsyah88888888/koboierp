
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findUnlinkedDeliveries() {
  try {
    const buyerName = "PT MEGA PROSINDO";
    const sku = "BEVKIT-382";
    console.log(`--- Searching for Deliveries for ${buyerName} with Product ${sku} ---`);
    
    const deliveries = await prisma.salesDelivery.findMany({
      where: { 
        buyerName: { contains: buyerName },
        isVoid: false
      },
      include: { items: { include: { product: true } } }
    });

    if (deliveries.length === 0) {
      console.log("No deliveries found for this buyer.");
      return;
    }

    deliveries.forEach(d => {
      console.log(`SJ: ${d.deliveryNumber} (ID: ${d.id}), Linked Order: ${d.orderId || 'NULL'}`);
      d.items.forEach(item => {
        if (item.product.sku === sku) {
          console.log(`  - ${sku}: Qty ${item.quantity}, Linked OrderItem: ${item.orderItemId || 'NULL'}`);
        }
      });
    });

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

findUnlinkedDeliveries();
