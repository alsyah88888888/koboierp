const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sd = await prisma.salesDelivery.findFirst({
    where: {
      invoiceNumber: 'KB-TRN-14072026-006'
    },
    include: {
      items: {
        include: {
          product: true
        }
      }
    }
  });

  if (!sd) {
    console.log("Sales delivery KB-TRN-14072026-006 not found!");
    return;
  }

  console.log("=== Sales Delivery Details ===");
  console.log("Invoice Number:", sd.invoiceNumber);
  console.log("Delivery Number:", sd.deliveryNumber);
  console.log("Date:", sd.date);
  console.log("Subtotal:", sd.subtotal);
  console.log("Total Discount:", sd.totalDiscount);
  console.log("Tax Rate:", sd.taxRate);
  console.log("Tax Amount:", sd.taxAmount);
  console.log("Grand Total:", sd.grandTotal);
  
  console.log("\n=== Items ===");
  sd.items.forEach(item => {
    console.log(`SKU: ${item.product.sku} | Name: ${item.product.name} | Qty: ${item.quantity} | Price: ${item.salesPrice} | Discount: ${item.discount}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
