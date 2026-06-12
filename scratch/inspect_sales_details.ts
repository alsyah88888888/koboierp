import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const deliveryNumber = "SJ-310-11062026-001";
  
  const sd = await prisma.salesDelivery.findUnique({
    where: { deliveryNumber },
    include: {
      order: {
        include: {
          items: {
            include: { product: true }
          }
        }
      },
      items: {
        include: {
          product: true,
          orderItem: true
        }
      }
    }
  });

  if (!sd) {
    console.log("Sales Delivery not found.");
    return;
  }

  console.log("=== Sales Delivery Details ===");
  console.log(`ID: ${sd.id}`);
  console.log(`DeliveryNumber: ${sd.deliveryNumber}`);
  console.log(`InvoiceNumber: ${sd.invoiceNumber}`);
  console.log(`Subtotal: ${sd.subtotal}`);
  console.log(`TotalDiscount: ${sd.totalDiscount}`);
  console.log(`TaxRate: ${sd.taxRate}%`);
  console.log(`TaxAmount: ${sd.taxAmount}`);
  console.log(`GrandTotal: ${sd.grandTotal}`);

  console.log("\n=== Sales Delivery Items ===");
  sd.items.forEach((item, idx) => {
    console.log(`Item #${idx+1}:`);
    console.log(`- Product: ${item.product.name} (${item.product.sku})`);
    console.log(`- Qty: ${item.quantity}`);
    console.log(`- SalesPrice (on SD item): ${item.salesPrice}`);
    console.log(`- Discount (on SD item): ${item.discount}`);
  });

  if (sd.order) {
    console.log("\n=== Linked Sales Order Details ===");
    console.log(`ID: ${sd.order.id}`);
    console.log(`OrderNumber: ${sd.order.orderNumber}`);
    console.log(`ProformaNumber: ${sd.order.proformaNumber}`);
    console.log(`Subtotal: ${sd.order.subtotal}`);
    console.log(`TotalDiscount: ${sd.order.totalDiscount}`);
    console.log(`TaxRate: ${sd.order.taxRate}%`);
    console.log(`TaxAmount: ${sd.order.taxAmount}`);
    console.log(`GrandTotal: ${sd.order.grandTotal}`);

    console.log("\n=== Sales Order Items ===");
    sd.order.items.forEach((item, idx) => {
      console.log(`Item #${idx+1}:`);
      console.log(`- Product: ${item.product.name} (${item.product.sku})`);
      console.log(`- Qty ordered: ${item.quantity}`);
      console.log(`- Shipped qty: ${item.shippedQuantity}`);
      console.log(`- SalesPrice (on SO item): ${item.salesPrice}`);
      console.log(`- Discount (on SO item): ${item.discount}`);
    });
  } else {
    console.log("\nNo linked Sales Order found.");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
