const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== CHECKING STOCK LEVELS ===");

  const skus = ["PERGAT-891", "PERGATSBY-260", "PERGATSBY-259", "PERGAT-375"];
  for (const sku of skus) {
    const product = await prisma.product.findUnique({
      where: { sku },
      include: {
        stocks: {
          include: {
            warehouse: true
          }
        }
      }
    });

    if (product) {
      console.log(`\nProduct: ${product.sku} - ${product.name}`);
      console.log(`Sales Price: ${product.salesPrice}, Purchase Price: ${product.purchasePrice}`);
      if (product.stocks.length > 0) {
        product.stocks.forEach(st => {
          console.log(`  * Stock in ${st.warehouse.name} (${st.vendorName}): ${st.quantity}`);
        });
      } else {
        console.log("  * No stock records found.");
      }
    } else {
      console.log(`\nProduct ${sku} not found!`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
