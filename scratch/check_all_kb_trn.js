const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== LISTING ALL KB-TRN TRANSACTIONS ===");
  const transactions = await prisma.financeTransaction.findMany({
    where: {
      OR: [
        { referenceNumber: { contains: "KB-TRN" } },
        { invoiceNumber: { contains: "KB-TRN" } },
        { receiptNumber: { contains: "KB-TRN" } }
      ]
    },
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { name: true, email: true } }
    }
  });

  console.log(`Found ${transactions.length} transactions:`);
  console.log(JSON.stringify(transactions, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
