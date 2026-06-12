const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const deliveries = await prisma.salesDelivery.findMany({
    where: {
      createdAt: {
        gte: new Date("2026-06-09T00:00:00Z"),
        lte: new Date("2026-06-13T23:59:59Z")
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  console.log("=== RECENT DELIVERIES ===");
  deliveries.forEach(d => {
    console.log(`ID: ${d.id} | DeliveryNumber: ${d.deliveryNumber} | InvoiceNumber: ${d.invoiceNumber} | CreatedAt: ${d.createdAt.toISOString()}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
