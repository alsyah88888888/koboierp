const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ids = [
    'cmq9ggamv00jpl1du5igme005',
    'cmq80gdu400o5l1pt0eqf7z7c',
    'cmq9eeapi00fsl1du2q21ybza'
  ];

  const deliveries = await prisma.salesDelivery.findMany({
    where: {
      id: { in: ids }
    }
  });

  console.log("=== INSPECTING SELECTED DELIVERIES ===");
  deliveries.forEach(d => {
    console.log(`ID: ${d.id}`);
    console.log(`  DeliveryNumber: ${d.deliveryNumber}`);
    console.log(`  InvoiceNumber:  ${d.invoiceNumber}`);
    console.log(`  Date (date field): ${d.date ? d.date.toISOString() : 'null'}`);
    console.log(`  CreatedAt:      ${d.createdAt.toISOString()}`);
    console.log(`  UpdatedAt:      ${d.updatedAt.toISOString()}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
