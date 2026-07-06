const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getTraceability(startDate, endDate) {
    const isAll = true;
    const deliveries = await prisma.salesDelivery.findMany({
        where: { isVoid: false, date: { gte: startDate, lte: endDate } },
        include: {
            items: { include: { product: true, lotAllocations: { include: { lot: true } } } }
        },
        orderBy: { date: 'asc' }
    });

    const grs = await prisma.goodsReceipt.findMany({
        where: { isVoid: false, date: { lte: endDate } },
        include: { items: true }
    });

    // ... I won't rewrite the whole Traceability logic, it's too big.
    // Instead I'll just write a script that compiles report-service.ts to JS using tsc
}
