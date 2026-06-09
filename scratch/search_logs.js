const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== SCANNING ALL AUDIT LOGS FOR TARGET TRANSACTION ===");
  
  const txId = "cmq57eqtc006ul1bbiyh0kgk1";
  const ref = "KB-TRN-05062026-003";

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" }
  });

  const matchedLogs = logs.filter(log => {
    if (log.resourceId === txId) return true;
    const detailsStr = log.details ? JSON.stringify(log.details) : "";
    if (detailsStr.includes(txId) || detailsStr.includes(ref) || detailsStr.includes("KB-TRN-05062026-004")) {
      return true;
    }
    return false;
  });

  console.log(`Found ${matchedLogs.length} matched audit logs:`);
  matchedLogs.forEach(log => {
    console.log(`- [${log.createdAt.toISOString()}] Action: ${log.action}, Resource: ${log.resource}, ResourceId: ${log.resourceId}`);
    console.log(`  Details:`, JSON.stringify(log.details));
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
