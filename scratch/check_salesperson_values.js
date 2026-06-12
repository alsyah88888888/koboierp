const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const deliveries = await prisma.salesDelivery.findMany({
    select: { deliveryNumber: true, salesPerson: true }
  });

  const receipts = await prisma.goodsReceipt.findMany({
    select: { receiptNumber: true, salesPerson: true }
  });

  const uniqueSDSalesPerson = [...new Set(deliveries.map(d => d.salesPerson))];
  const uniqueSDPrefix = [...new Set(deliveries.map(d => d.deliveryNumber.split('-')[0]))];

  const uniqueGRSalesPerson = [...new Set(receipts.map(r => r.salesPerson))];
  const uniqueGRPrefix = [...new Set(receipts.map(r => r.receiptNumber.split('-')[0]))];

  console.log("=== Sales Delivery (Penjualan) ===");
  console.log("Unique salesPerson values:", uniqueSDSalesPerson);
  console.log("Unique deliveryNumber prefix (first token):", uniqueSDPrefix);
  console.log("Sample deliveryNumber:", deliveries.slice(0, 5).map(d => d.deliveryNumber));

  console.log("\n=== Goods Receipt (Pembelian) ===");
  console.log("Unique salesPerson values:", uniqueGRSalesPerson);
  console.log("Unique receiptNumber prefix (first token):", uniqueGRPrefix);
  console.log("Sample receiptNumber:", receipts.slice(0, 5).map(r => r.receiptNumber));
}

main().catch(console.error).finally(() => prisma.$disconnect());
