const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixMatahariDB() {
    // 1. Delete orphaned Journals from the deleted/ghost receipt that no longer exists (created on March 25)
    // The exact date was: 2026-03-25T00:00:00.000Z
    console.log("Deleting orphaned journals (March 25)...");
    const count = await prisma.journalEntry.deleteMany({
        where: {
            description: { contains: "KB-LPB-20260324-001" },
            date: new Date('2026-03-25T00:00:00.000Z')
        }
    });
    console.log(`Deleted ${count.count} old orphaned journals.`);

    // 2. Fix Vendor Balance. 
    // The previous balance was 241,496,000. It effectively had 127,248,000 from the ghostly transaction
    // Then 127,248,000 from the new transaction
    // Plus the DPs. 
    // Just directly assign the correct current balance.
    // The ONLY active receipt is KB-LPB-20260324-001 which has GrandTotal 127,248,000 and Paid 6,500,000.
    // So the TRUE remaining debt is 120,748,000.
    console.log("Fixing vendor balance...");
    const vendor = await prisma.vendor.findFirst({ where: { name: { contains: "MATAHARI" } } });
    if (vendor) {
        await prisma.vendor.update({
            where: { id: vendor.id },
            data: { balance: 120748000 }
        });
        console.log("Vendor balance restored to 120,748,000.");
    }
}

fixMatahariDB().catch(console.error).finally(() => prisma.$disconnect());
