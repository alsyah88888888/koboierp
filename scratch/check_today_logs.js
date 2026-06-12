const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.auditLog.findMany({
    where: {
      createdAt: {
        gte: new Date("2026-06-12T00:00:00Z")
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 30
  });

  console.log("=== TODAY'S AUDIT LOGS ===");
  logs.forEach(l => {
    console.log(`[${l.createdAt.toISOString()}] User: ${l.userId} | Action: ${l.action} | Resource: ${l.resource} | ResourceId: ${l.resourceId}`);
    if (l.details) {
      console.log(`  Details: ${JSON.stringify(l.details)}`);
    }
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
