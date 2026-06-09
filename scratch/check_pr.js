const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== CHECKING RELATED TRANSACTIONS ===");

  // Find Purchase Request KB-PR-20260608-005
  const pr = await prisma.purchaseRequest.findFirst({
    where: { number: "KB-PR-20260608-005" },
    include: {
      items: true,
      requestedBy: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
      verifiedBy: { select: { id: true, name: true, email: true } }
    }
  });
  console.log("Purchase Request details:", JSON.stringify(pr, null, 2));

  // Find Finance Transaction for KB-TRN-05062026-003
  const ft3 = await prisma.financeTransaction.findFirst({
    where: { invoiceNumber: "KB-TRN-05062026-003" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } }
    }
  });
  console.log("Finance Transaction 003:", JSON.stringify(ft3, null, 2));

  // Find Finance Transaction for KB-TRN-05062026-004
  const ft4 = await prisma.financeTransaction.findFirst({
    where: {
      OR: [
        { referenceNumber: { contains: "KB-TRN-05062026-004" } },
        { invoiceNumber: { contains: "KB-TRN-05062026-004" } }
      ]
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } }
    }
  });
  console.log("Finance Transaction 004:", JSON.stringify(ft4, null, 2));

  // Find all journal entries with transactionId from these
  const transactionIds = [ft3?.id, ft4?.id].filter(Boolean);
  if (transactionIds.length > 0) {
    const journals = await prisma.journalEntry.findMany({
      where: { transactionId: { in: transactionIds } },
      include: { account: true, createdBy: { select: { name: true } } }
    });
    console.log("Journal Entries:", JSON.stringify(journals, null, 2));
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
