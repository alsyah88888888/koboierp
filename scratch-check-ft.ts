import { getPrisma } from "./src/lib/prisma";
async function run() {
    const prisma = getPrisma();
    const fts = await prisma.financeTransaction.findMany({
        where: { referenceNumber: { startsWith: 'KB-' } },
        take: 5
    });
    console.log(JSON.stringify(fts, null, 2));
}
run();
