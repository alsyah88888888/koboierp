import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Let's get the date range the user might be looking at (probably July or August 2026)
  // We'll just look at all ops and deliveries
  const ops = await prisma.operational.findMany({
    where: { date: { gte: new Date('2026-07-01'), lte: new Date('2026-08-31') } },
    include: { createdBy: true }
  });
  
  console.log("Found", ops.length, "operational transactions");
}
main().finally(() => prisma.$disconnect());
