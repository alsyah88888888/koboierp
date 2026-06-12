const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("=== CHECKING RECENT DELIVERIES ===");
    const deliveries = await prisma.salesDelivery.findMany({
        take: 15,
        orderBy: { date: 'desc' },
        include: {
            createdBy: true,
            items: true
        }
    });
    
    console.log(`Found ${deliveries.length} deliveries:`);
    for (const d of deliveries) {
        console.log({
            id: d.id,
            deliveryNumber: d.deliveryNumber,
            date: d.date.toISOString(),
            buyerName: d.buyerName,
            recipient: d.recipient,
            salesPerson: d.salesPerson,
            grandTotal: d.grandTotal,
            paymentStatus: d.paymentStatus,
            itemsCount: d.items.length
        });
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
