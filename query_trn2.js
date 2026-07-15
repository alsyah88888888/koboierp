const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sd = await prisma.salesDelivery.findFirst({
    where: {
      OR: [
        { invoiceNumber: 'KB-TRN-22062026-012' },
        { invoiceNumber: { contains: '22062026-012' } },
        { deliveryNumber: { contains: 'KB-TRN-22062026-012' } }
      ]
    },
    include: {
      order: true
    }
  });

  if (!sd) {
    console.log("Sales delivery not found!");
    return;
  }

  console.log("=== Sales Delivery Details ===");
  console.log("Invoice Number:", sd.invoiceNumber);
  console.log("Delivery Number:", sd.deliveryNumber);
  console.log("Delivery Date:", sd.date);
  console.log("Delivery CreatedAt:", sd.createdAt);
  console.log("OrderId:", sd.orderId);
  if (sd.order) {
    console.log("=== Linked Sales Order (PI) Details ===");
    console.log("SO Order Number:", sd.order.orderNumber);
    console.log("SO Date:", sd.order.date);
    console.log("SO CreatedAt:", sd.order.createdAt);
    console.log("SO Invoice Number:", sd.order.invoiceNumber);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
