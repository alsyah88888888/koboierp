const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== COMPARING SALES DELIVERY WITH SALES ORDER ===");
  const soId = "cmq0s50r300hil1tniplimsgv";
  const sdId = "cmq0v5e4p00myl1tnh74c4us0";

  // 1. Fetch the SalesOrder
  const so = await prisma.salesOrder.findUnique({
    where: { id: soId },
    include: {
      items: {
        include: { product: true }
      }
    }
  });

  console.log("=== SALES ORDER DETAILS ===");
  console.log(`Order Number: ${so.orderNumber}`);
  console.log(`Buyer Name: ${so.buyerName}`);
  console.log(`Status: ${so.status}`);
  console.log(`Grand Total: ${so.grandTotal}`);
  console.log("Items in Sales Order:");
  so.items.forEach(item => {
    console.log(`- ${item.product.sku} (${item.product.name}): Qty ${item.quantity}, Shipped: ${item.shippedQuantity}, Price: ${item.salesPrice}`);
  });

  // 2. Fetch the SalesDelivery
  const sd = await prisma.salesDelivery.findUnique({
    where: { id: sdId },
    include: {
      items: {
        include: { product: true }
      }
    }
  });

  console.log("\n=== SALES DELIVERY DETAILS ===");
  console.log(`Delivery Number: ${sd.deliveryNumber}`);
  console.log(`Invoice Number: ${sd.invoiceNumber}`);
  console.log(`Grand Total: ${sd.grandTotal}`);
  console.log("Items in Sales Delivery:");
  sd.items.forEach(item => {
    console.log(`- ${item.product.sku} (${item.product.name}): Qty ${item.quantity}, Price: ${item.salesPrice}`);
  });

  // 3. Let's find any other deliveries for this Sales Order
  const otherSds = await prisma.salesDelivery.findMany({
    where: {
      orderId: soId,
      NOT: { id: sdId }
    },
    include: {
      items: { include: { product: true } }
    }
  });
  console.log(`\nFound ${otherSds.length} other deliveries for this Sales Order.`);
  otherSds.forEach(other => {
    console.log(`- Delivery: ${other.deliveryNumber}, Invoice: ${other.invoiceNumber}, Grand Total: ${other.grandTotal}`);
    other.items.forEach(item => {
      console.log(`  * ${item.product.sku}: Qty ${item.quantity}`);
    });
  });

  // 4. Query AuditLog for this specific SalesDelivery
  const logs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { resourceId: sdId },
        { resourceId: soId }
      ]
    },
    orderBy: { createdAt: "desc" }
  });
  console.log(`\n=== AUDIT LOGS FOR THIS SO/SD (${logs.length} found) ===`);
  logs.forEach(log => {
    console.log(`- [${log.createdAt.toISOString()}] Action: ${log.action}, Details:`, JSON.stringify(log.details));
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
