const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== CHECKING AUDIT LOGS ===");

  const txId = "cmq57eqtc006ul1bbiyh0kgk1";
  const prId = "cmq56yeu80053l1bbwhdedkw5";
  const purchaseOfficerId = "cmm3yw5v40002uusg4fbngix8";

  // Query AuditLogs by resourceId
  const logsByResourceId = await prisma.auditLog.findMany({
    where: {
      OR: [
        { resourceId: txId },
        { resourceId: prId }
      ]
    },
    include: {
      user: { select: { name: true, email: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  console.log(`Found ${logsByResourceId.length} logs by resourceId:`);
  console.log(JSON.stringify(logsByResourceId, null, 2));

  // Query AuditLogs by userId
  const logsByUser = await prisma.auditLog.findMany({
    where: {
      userId: purchaseOfficerId
    },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  console.log(`Found recent ${logsByUser.length} logs by Purchase Officer:`);
  logsByUser.forEach(log => {
    console.log(`- ${log.createdAt.toISOString()}: Action: ${log.action}, Resource: ${log.resource}, ResourceId: ${log.resourceId}`);
    if (log.details) {
      console.log(`  Details:`, JSON.stringify(log.details));
    }
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
