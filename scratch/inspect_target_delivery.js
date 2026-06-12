const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const delivery = await prisma.salesDelivery.findFirst({
      where: {
        OR: [
          { invoiceNumber: 'KB-TRD-12062026-006' },
          { deliveryNumber: 'SJ-231-12062026-018' }
        ]
      },
      include: {
        items: {
          include: {
            product: true,
            lotAllocations: {
              include: {
                lot: true
              }
            }
          }
        }
      }
    });

    console.log('TARGET DELIVERY DETAILS:');
    if (delivery) {
      console.log(`ID: ${delivery.id}`);
      console.log(`Delivery Number: ${delivery.deliveryNumber}`);
      console.log(`Invoice Number: ${delivery.invoiceNumber}`);
      console.log(`Sales Person: ${delivery.salesPerson}`);
      console.log(`Warehouse ID: ${delivery.warehouseId}`);
      console.log(`Is Void: ${delivery.isVoid}`);
      console.log(`Items count: ${delivery.items.length}`);
      
      delivery.items.forEach((item, idx) => {
        console.log(`\nItem ${idx + 1}:`);
        console.log(`  ID: ${item.id}`);
        console.log(`  Product: ${item.product.name} (${item.product.sku})`);
        console.log(`  Quantity: ${item.quantity}`);
        console.log(`  Vendor (Supplier) Name: ${item.vendorName}`);
        console.log(`  Allocations count: ${item.lotAllocations.length}`);
        item.lotAllocations.forEach((alloc, aIdx) => {
          console.log(`    Allocation ${aIdx + 1}: Qty: ${alloc.qty}, HPP: ${alloc.hppAtTime}, Lot Supplier: ${alloc.lot?.supplierName}, Lot GR: ${alloc.lot?.grNumber}`);
        });
      });
    } else {
      console.log('Not found!');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
