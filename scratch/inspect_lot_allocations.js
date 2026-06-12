const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function run() {
    const allocs = await prisma.lotAllocation.findMany({
        where: { sdItemId: "cmq9g4ziq00ivl1dune1hbn2l" },
        include: { lot: true }
    });
    console.log("=== Lot Allocations ===");
    console.log(JSON.stringify(allocs, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
