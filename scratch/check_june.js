const { getPrisma } = require("../src/lib/prisma");

async function checkJune() {
    const prisma = getPrisma();
    const startDate = new Date(2026, 5, 1);
    const endDate = new Date(2026, 6, 0, 23, 59, 59, 999);

    const deliveries = await prisma.salesDelivery.findMany({
        where: {
            date: {
                gte: startDate,
                lte: endDate
            }
        }
    });

    console.log(`June 2026 deliveries count: ${deliveries.length}`);
    deliveries.forEach(d => {
        console.log({
            id: d.id,
            deliveryNumber: d.deliveryNumber,
            buyerName: d.buyerName,
            isVoid: d.isVoid,
            subtotal: Number(d.subtotal),
            totalDiscount: Number(d.totalDiscount),
            taxAmount: Number(d.taxAmount),
            grandTotal: Number(d.grandTotal),
            paidAmount: Number(d.paidAmount),
            createdAt: d.createdAt,
            date: d.date
        });
    });
}

checkJune().catch(console.error);
