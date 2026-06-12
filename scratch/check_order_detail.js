const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const order = await prisma.salesOrder.findFirst({
    where: { orderNumber: "KB-PO-11062026-007" },
    include: { deliveries: true }
  });

  if (!order) {
    console.log("Order not found");
    return;
  }

  console.log(`Order: ${order.orderNumber} | InvoiceNumber: ${order.invoiceNumber}`);
  console.log("Deliveries:");
  order.deliveries.forEach(d => {
    console.log(`  ID: ${d.id} | DeliveryNumber: ${d.deliveryNumber} | InvoiceNumber: ${d.invoiceNumber}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
