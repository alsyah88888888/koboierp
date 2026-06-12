const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const deliveryNumber = "SJ-894-12062026-011";
  const sd = await prisma.salesDelivery.findUnique({
    where: { deliveryNumber },
    include: {
      items: {
        include: { product: true }
      }
    }
  });
  console.log("=== SJ-894-12062026-011 Details ===");
  console.log(JSON.stringify(sd, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
