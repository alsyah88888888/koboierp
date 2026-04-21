
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const orders = await prisma.salesOrder.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { orderNumber: true, buyerName: true, status: true, createdAt: true }
    });
    console.log("5 SALES ORDERS TERBARU:");
    console.log(JSON.stringify(orders, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
