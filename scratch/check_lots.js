const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== CHECKING PRODUCT LOTS FOR KB-LPB-12062026-005 ===");

  const grNumber = "KB-LPB-12062026-005";
  const lots = await prisma.productLot.findMany({
    where: {
      grNumber: grNumber
    },
    include: {
      grItem: {
        include: {
          product: true,
          receipt: true
        }
      }
    }
  });

  console.log(`Found ${lots.length} lots for grNumber: ${grNumber}`);
  lots.forEach((l, idx) => {
    console.log(`Lot ${idx+1}:`);
    console.log(`  ID: ${l.id}`);
    console.log(`  Product: ${l.grItem?.product?.name} (${l.grItem?.product?.sku})`);
    console.log(`  Initial Qty: ${l.initialQty}, Remaining Qty: ${l.remainingQty}`);
    console.log(`  Purchase Price: ${l.purchasePrice}, Landed Cost: ${l.landedCost}`);
    console.log(`  Supplier Name: ${l.supplierName}`);
    console.log(`  GR Number: ${l.grNumber}, GR Date: ${l.grDate}`);
  });

  if (lots.length === 0) {
    // Search general lots
    console.log("Searching latest 5 lots overall:");
    const latestLots = await prisma.productLot.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        grItem: {
          include: {
            product: true
          }
        }
      }
    });
    console.log(JSON.stringify(latestLots, null, 2));
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
