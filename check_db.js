const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMatahari() {
    const vendor = await prisma.vendor.findFirst({ where: { name: { contains: "MATAHARI" } } });
    console.log("VENDOR BALANCE:", vendor.balance);

    const receipts = await prisma.goodsReceipt.findMany({
        where: { receivedFrom: vendor.name },
        include: { items: true }
    });
    console.log("\n--- RECEIPTS ---");
    receipts.forEach(r => console.log(`${r.receiptNumber}: GrandTotal ${r.grandTotal}, Paid ${r.paidAmount}, Status ${r.paymentStatus}, Verified ${r.isVerified}`));

    const journals = await prisma.journalEntry.findMany({
        where: { description: { contains: "MATAHARI" } },
        orderBy: { date: 'asc' }
    });
    console.log("\n--- JOURNALS ---");
    journals.forEach(j => console.log(`${j.date.toISOString()} | ${j.type} | ${j.amount} | ${j.description}`));
}

checkMatahari().catch(console.error).finally(() => prisma.$disconnect());
