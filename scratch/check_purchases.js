const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("=== CHECKING RECENT PURCHASES (GOODS RECEIPTS) ===");
    const receipts = await prisma.goodsReceipt.findMany({
        take: 15,
        orderBy: { date: 'desc' },
        include: {
            createdBy: true,
            items: true
        }
    });
    
    console.log(`Found ${receipts.length} receipts:`);
    for (const r of receipts) {
        console.log({
            id: r.id,
            receiptNumber: r.receiptNumber,
            date: r.date.toISOString(),
            receivedFrom: r.receivedFrom,
            salesPerson: r.salesPerson,
            grandTotal: r.grandTotal,
            paymentStatus: r.paymentStatus,
            itemsCount: r.items.length
        });
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
