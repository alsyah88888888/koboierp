
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMegaProsindo() {
  try {
    console.log(`--- Checking All Deliveries for PT MEGA PROSINDO ---`);
    
    const deliveries = await prisma.salesDelivery.findMany({
      where: { 
        buyerName: { contains: "MEGA PROSINDO" },
        isVoid: false
      },
      include: { items: { include: { product: true } } },
      orderBy: { date: 'desc' }
    });

    deliveries.forEach(d => {
      console.log(`SJ: ${d.deliveryNumber} (Date: ${d.date.toISOString().split('T')[0]}), Linked Order: ${d.orderId || 'NULL'}`);
      d.items.forEach(item => {
          console.log(`  - ${item.product.sku}: ${item.quantity}, Link: ${item.orderItemId ? 'YES' : 'NO'}`);
      });
    });

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkMegaProsindo();
