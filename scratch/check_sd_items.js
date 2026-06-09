const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== CHECKING SALES DELIVERY ITEMS TIMESTAMPS ===");
  const sdId = "cmq0v5e4p00myl1tnh74c4us0";

  const items = await prisma.salesDeliveryItem.findMany({
    where: { deliveryId: sdId },
    include: {
      product: true
    }
  });

  items.forEach(item => {
    // Note: SalesDeliveryItem doesn't have its own createdAt/updatedAt in the schema usually, but let's check
    console.log(`- Item: ${item.product.sku} (ID: ${item.id}), Qty: ${item.quantity}, Price: ${item.salesPrice}, orderItemId: ${item.orderItemId}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
