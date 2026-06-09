const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== CHECKING AUDIT LOGS FOR JUNE 8, 2026 ===");
  
  const startDate = new Date("2026-06-08T00:00:00.000Z");
  const endDate = new Date("2026-06-08T23:59:59.999Z");

  const logs = await prisma.auditLog.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      user: { select: { name: true, email: true } }
    },
    orderBy: { createdAt: "asc" }
  });

  console.log(`Found ${logs.length} logs on June 8:`);
  logs.forEach(log => {
    console.log(`- [${log.createdAt.toISOString()}] User: ${log.user?.name} (${log.user?.email})`);
    console.log(`  Action: ${log.action}, Resource: ${log.resource}, ResourceId: ${log.resourceId}`);
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
