const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const targetDate = new Date('2026-06-12');
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    console.log("Date range:", dayStart.toISOString(), "to", dayEnd.toISOString());

    console.log("\n--- Sales Deliveries (ALL) ---");
    const allSales = await prisma.salesDelivery.findMany({
        where: {
            isVoid: false,
            date: { gte: dayStart, lte: dayEnd }
        }
    });
    console.log(`ALL count: ${allSales.length}`);
    console.log(allSales.map(s => ({ deliveryNumber: s.deliveryNumber, salesPerson: s.salesPerson, grandTotal: s.grandTotal })));

    console.log("\n--- Sales Deliveries (PF) ---");
    const pfSales = await prisma.salesDelivery.findMany({
        where: {
            isVoid: false,
            date: { gte: dayStart, lte: dayEnd },
            salesPerson: 'PF'
        }
    });
    console.log(`PF count: ${pfSales.length}`);
    console.log(pfSales.map(s => ({ deliveryNumber: s.deliveryNumber, salesPerson: s.salesPerson, grandTotal: s.grandTotal })));

    console.log("\n--- Sales Deliveries (BC) ---");
    const bcSales = await prisma.salesDelivery.findMany({
        where: {
            isVoid: false,
            date: { gte: dayStart, lte: dayEnd },
            salesPerson: 'BC'
        }
    });
    console.log(`BC count: ${bcSales.length}`);
    console.log(bcSales.map(s => ({ deliveryNumber: s.deliveryNumber, salesPerson: s.salesPerson, grandTotal: s.grandTotal })));
}

test().catch(console.error).finally(() => prisma.$disconnect());
