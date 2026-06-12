const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const sd = await prisma.salesDelivery.count({ where: { isVoid: false } });
  const sdItems = await prisma.salesDeliveryItem.count({
    where: { delivery: { isVoid: false } }
  });
  console.log(`Total Sales Deliveries: ${sd}`);
  console.log(`Total Sales Delivery Items: ${sdItems}`);
  await prisma.$disconnect();
}
run();
