const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const poNum = 'KB-PO-10062026-008';
  
  // Find SalesOrder (PI) including its items and deliveries
  const order = await prisma.salesOrder.findFirst({
    where: {
      orderNumber: poNum
    },
    include: {
      items: {
        include: {
          product: true
        }
      },
      deliveries: {
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      }
    }
  });

  if (!order) {
    console.log(`SalesOrder ${poNum} not found!`);
    return;
  }

  console.log("=== Sales Order Details ===");
  console.log("Order Number:", order.orderNumber);
  console.log("Status:", order.status);
  console.log("Date:", order.date);
  console.log("Buyer Name:", order.buyerName);
  console.log("Grand Total:", order.grandTotal);
  console.log("Invoice Number:", order.invoiceNumber);

  console.log("\n=== Sales Order Items ===");
  order.items.forEach(item => {
    console.log(`SKU: ${item.product.sku} | Qty Ordered: ${item.quantity} | Shipped: ${item.shippedQuantity}`);
  });

  console.log("\n=== Linked Sales Deliveries ===");
  console.log(`Count: ${order.deliveries.length}`);
  order.deliveries.forEach(d => {
    console.log(`Delivery Number: ${d.deliveryNumber} | Invoice Number: ${d.invoiceNumber} | Status: ${d.isVoid ? 'VOID' : 'ACTIVE'} | Date: ${d.date}`);
    d.items.forEach(item => {
      console.log(`  SKU: ${item.product.sku} | Qty Shipped: ${item.quantity}`);
    });
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
