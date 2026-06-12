const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== CHECKING LPB KB-LPB-12062026-005 / ELLEE ===");

  const receipt = await prisma.goodsReceipt.findFirst({
    where: {
      receiptNumber: {
        contains: "KB-LPB-12062026-005"
      }
    },
    include: {
      items: {
        include: {
          product: true
        }
      },
      warehouse: true
    }
  });

  console.log("GoodsReceipt found:", JSON.stringify(receipt, null, 2));

  if (!receipt) {
    // Search by supplier/receivedFrom Name
    console.log("No exact receipt, searching by receivedFrom name containing ELLEE...");
    const receipts = await prisma.goodsReceipt.findMany({
      where: {
        receivedFrom: {
          contains: "ELLEE"
        }
      },
      take: 5
    });
    console.log("Receipts for supplier containing ELLEE:", JSON.stringify(receipts, null, 2));
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
