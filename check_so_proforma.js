const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const salesOrders = await prisma.salesOrder.findMany({
    select: {
      id: true,
      orderNumber: true,
      proformaNumber: true,
      status: true
    }
  });
  console.log("TOTAL SALES ORDERS:", salesOrders.length);
  console.log("SALES ORDERS LIST:");
  salesOrders.forEach(so => {
    console.log(`ID: ${so.id} | Order: ${so.orderNumber} | Proforma: ${so.proformaNumber} | Status: ${so.status}`);
  });

  const nullProforma = salesOrders.filter(so => so.proformaNumber === null);
  const emptyProforma = salesOrders.filter(so => so.proformaNumber === "");
  const duplicates = {};
  salesOrders.forEach(so => {
    if (so.proformaNumber) {
      duplicates[so.proformaNumber] = (duplicates[so.proformaNumber] || 0) + 1;
    }
  });
  console.log("\nNull proforma count:", nullProforma.length);
  console.log("Empty string proforma count:", emptyProforma.length);
  console.log("Duplicates map:", Object.entries(duplicates).filter(([k, v]) => v > 1));
}

run().catch(console.error).finally(() => prisma.$disconnect());
