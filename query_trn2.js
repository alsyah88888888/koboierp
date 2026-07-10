const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== Stock Records for PT INTI CAKRAWALA CITRA ===");
  const stocks = await prisma.stock.findMany({
    where: {
      vendorName: { contains: 'PT INTI CAKRAWALA CITRA' }
    },
    include: {
      product: true
    }
  });

  stocks.forEach(s => {
    console.log(`Product: ${s.product.sku} - ${s.product.name} | Vendor: '${s.vendorName}' | Qty: ${s.quantity}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
