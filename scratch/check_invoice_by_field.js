const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== CHECKING SALES DELIVERIES FOR INVOICE ===");
  const query = "KB-TRN-05062026-003";

  const delivery = await prisma.salesDelivery.findFirst({
    where: {
      invoiceNumber: query
    },
    include: {
      items: {
        include: {
          product: true
        }
      },
      createdBy: {
        select: { name: true, email: true }
      }
    }
  });

  if (delivery) {
    console.log("Found SalesDelivery:", JSON.stringify(delivery, null, 2));
  } else {
    console.log("No SalesDelivery found with invoiceNumber = " + query);
    
    // Let's do a broad search on SalesDelivery for any part of it
    const allSds = await prisma.salesDelivery.findMany({
      where: {
        OR: [
          { deliveryNumber: { contains: query } },
          { poNumber: { contains: query } },
          { invoiceNumber: { contains: query } }
        ]
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });
    console.log(`Broad SalesDelivery search found ${allSds.length} records:`, JSON.stringify(allSds, null, 2));
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
