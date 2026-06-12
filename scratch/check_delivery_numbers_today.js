const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dateStr = "12062026";
  const deliveries = await prisma.salesDelivery.findMany({
    where: {
      deliveryNumber: {
        contains: `-${dateStr}-`
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  console.log(`=== DELIVERIES CONTAINING -${dateStr}- ===`);
  deliveries.forEach(d => {
    console.log(`ID: ${d.id} | DeliveryNumber: ${d.deliveryNumber} | InvoiceNumber: ${d.invoiceNumber} | CreatedAt: ${d.createdAt.toISOString()}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
