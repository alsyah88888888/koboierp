const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function parseCuidTime(cuid) {
  if (!cuid || cuid[0] !== 'c') return null;
  const timeStr = cuid.substr(1, 8);
  const timestamp = parseInt(timeStr, 36);
  return new Date(timestamp);
}

async function main() {
  console.log("=== STOCK MOVEMENTS ===");
  const query = "SJ-673-06062026-002";
  const invoice = "KB-TRN-05062026-003";

  const movements = await prisma.stockMovement.findMany({
    where: {
      OR: [
        { reference: { contains: query } },
        { reference: { contains: invoice } }
      ]
    },
    include: {
      product: true
    },
    orderBy: { createdAt: "asc" }
  });

  console.log(`Found ${movements.length} stock movements:`);
  movements.forEach(m => {
    console.log(`- ID: ${m.id} (${parseCuidTime(m.id)?.toISOString()}), Product: ${m.product.sku}, Qty: ${m.quantity}, Type: ${m.type}, Reference: ${m.reference}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
