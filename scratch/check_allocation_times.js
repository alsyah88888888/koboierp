const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function parseCuidTime(cuid) {
  if (!cuid || cuid[0] !== 'c') return null;
  const timeStr = cuid.substr(1, 8);
  const timestamp = parseInt(timeStr, 36);
  return new Date(timestamp);
}

async function main() {
  console.log("=== ALLOCATION TIMESTAMPS ===");
  const sdId = "cmq0v5e4p00myl1tnh74c4us0";

  const allocations = await prisma.lotAllocation.findMany({
    where: {
      sdItem: { deliveryId: sdId }
    },
    include: {
      sdItem: { include: { product: true } }
    }
  });

  allocations.forEach(alloc => {
    console.log(`- ID: ${alloc.id} (${parseCuidTime(alloc.id)?.toISOString()}), Item: ${alloc.sdItem.product.sku}, Qty: ${alloc.qty}, hpp: ${alloc.hppAtTime}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
