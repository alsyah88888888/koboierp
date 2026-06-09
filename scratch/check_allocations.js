const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== CHECKING LOT ALLOCATIONS FOR THE DELIVERY ===");
  const sdId = "cmq0v5e4p00myl1tnh74c4us0";

  const allocations = await prisma.lotAllocation.findMany({
    where: {
      sdItemId: {
        in: await prisma.salesDeliveryItem.findMany({
          where: { deliveryId: sdId },
          select: { id: true }
        }).then(items => items.map(i => i.id))
      }
    },
    include: {
      lot: {
        include: {
          product: true
        }
      },
      sdItem: {
        include: {
          product: true
        }
      }
    }
  });

  console.log(`Found ${allocations.length} lot allocations:`);
  allocations.forEach(alloc => {
    console.log(`- Item: ${alloc.sdItem.product.sku} (${alloc.sdItem.product.name})`);
    console.log(`  Allocated Qty: ${alloc.qty}, HPP at Time: ${alloc.hppAtTime}`);
    console.log(`  Lot Number: ${alloc.lot.lotNumber}, Supplier: ${alloc.lot.supplierName}, GR Number: ${alloc.lot.grNumber}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
