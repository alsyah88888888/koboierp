const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const productId = "cmm3z2saa003yuumcgghclntq"; // Downy 1000 Sunrise Fresh
    const vendorName = "ELLEE KARUNIA SEJAHTERA";
    const warehouseId = "cmm4a82ll0008uu4gdktls8kf";
    const salesPerson = "BC";

    console.log("Searching lots with strict query:");
    const lotsStrict = await prisma.productLot.findMany({
      where: {
        productId: productId,
        supplierName: vendorName,
        isVoided: false,
        grItem: {
          receipt: {
            warehouseId: warehouseId,
            salesPerson: salesPerson
          }
        }
      },
      include: {
        grItem: {
          include: {
            receipt: true
          }
        }
      }
    });
    console.log(`Strict match count: ${lotsStrict.length}`);
    if (lotsStrict.length > 0) {
      console.log("Strict matches:", JSON.stringify(lotsStrict, null, 2));
    }

    console.log("\nSearching lots matching only productId, vendorName, isVoided:");
    const lotsProdVendor = await prisma.productLot.findMany({
      where: {
        productId: productId,
        supplierName: vendorName,
        isVoided: false
      },
      include: {
        grItem: {
          include: {
            receipt: true
          }
        }
      }
    });
    console.log(`Product & Vendor match count: ${lotsProdVendor.length}`);
    lotsProdVendor.forEach((l, idx) => {
      console.log(`Lot ${idx+1}:`);
      console.log(`  ID: ${l.id}`);
      console.log(`  Supplier: ${l.supplierName}`);
      console.log(`  Warehouse: ${l.grItem?.receipt?.warehouseId}`);
      console.log(`  Sales Person (Receipt): ${l.grItem?.receipt?.salesPerson}`);
      console.log(`  Receipt Number: ${l.grItem?.receipt?.receiptNumber}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
