const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const start = new Date('2026-05-31T17:00:00.000Z');
    const end = new Date('2026-06-01T16:59:59.999Z');
    // Find all sales deliveries on June 1
    const sds = await prisma.salesDelivery.findMany({
        where: { date: { gte: start, lte: end } },
        select: { id: true, deliveryNumber: true }
    });
    
    // Find ops linked to those sales deliveries
    for (const sd of sds) {
        const ops = await prisma.financeTransaction.findMany({
            where: { linkedSalesId: sd.id }
        });
        if (ops.length > 0) {
            console.log(`Sales Delivery ${sd.deliveryNumber} has Ops:`, ops);
        }
    }
}
main().finally(() => prisma.$disconnect());
