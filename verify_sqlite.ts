import { PrismaClient } from "./node_modules/@prisma/client-sqlite";

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log("Checking JournalEntry createdById support...");
    const journals = await prisma.journalEntry.findMany({
      where: {
        createdById: "some-test-id"
      },
      take: 1
    });
    console.log("SUCCESS: createdById is recognized by the SQLite client.");
    
    console.log("Checking User journals relation...");
    const user = await prisma.user.findFirst({
      include: { journals: true }
    });
    console.log("SUCCESS: back-relation to journals is recognized.");
    
  } catch (err: any) {
    console.error("FAILURE:", err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
