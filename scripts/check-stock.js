const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const stocks = await prisma.stock.findMany();
  const distinctVendors = [...new Set(stocks.map(s => s.vendorName))];
  console.log('Vendors:', distinctVendors);
}
run();
