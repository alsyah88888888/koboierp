import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const target = 'KB-TRN-08072026-006';
    console.log(`\n### Searching exact matches for ${target} ###`);

    const sd = await prisma.salesDelivery.findMany({
        where: { OR: [{ deliveryNumber: target }, { invoiceNumber: target }] },
        include: { items: { include: { product: true } }, order: true },
    });
    console.log(`SalesDelivery matches: ${sd.length}`);
    for (const d of sd) {
        console.log(`  ${d.deliveryNumber} | invoiceNumber=${d.invoiceNumber} | buyer=${d.buyerName} | date=${d.date.toISOString()} | isVoid=${d.isVoid} voidReason=${d.voidReason} | createdAt=${d.createdAt.toISOString()} updatedAt=${d.updatedAt.toISOString()} | order#=${d.order?.orderNumber}`);
    }

    const so = await prisma.salesOrder.findMany({
        where: { OR: [{ orderNumber: target }, { proformaNumber: target }, { invoiceNumber: target }] },
        include: { deliveries: true },
    });
    console.log(`SalesOrder matches: ${so.length}`);
    for (const o of so) {
        console.log(`  ${o.orderNumber} | proforma=${o.proformaNumber} | invoiceNumber(locked)=${o.invoiceNumber} | buyer=${o.buyerName} | status=${o.status} | date=${o.date.toISOString()} | createdAt=${o.createdAt.toISOString()} updatedAt=${o.updatedAt.toISOString()} | deliveries=${o.deliveries.map(d=>d.deliveryNumber).join(',')}`);
    }

    console.log(`\n### Any AuditLog mentioning this number? ###`);
    const logs = await prisma.auditLog.findMany({
        where: {
            OR: [
                { resourceId: { contains: '08072026' } },
            ]
        },
        take: 20,
        orderBy: { createdAt: 'desc' },
    });
    console.log(`AuditLog resourceId contains '08072026': ${logs.length}`);

    // broader: any audit log whose details JSON mentions the string
    const allRecentLogs = await prisma.auditLog.findMany({
        where: { createdAt: { gte: new Date('2026-07-01') } },
        orderBy: { createdAt: 'desc' },
        take: 500,
    });
    const matching = allRecentLogs.filter(l => JSON.stringify(l.details || {}).includes('08072026') || JSON.stringify(l.details||{}).toUpperCase().includes('INTRADITA'));
    console.log(`AuditLogs since 2026-07-01 mentioning '08072026' or 'INTRADITA' in details: ${matching.length}`);
    for (const l of matching) {
        console.log(`  [${l.createdAt.toISOString()}] action=${l.action} resource=${l.resource} resourceId=${l.resourceId} userId=${l.userId}`);
        console.log(`     details=${JSON.stringify(l.details).slice(0, 500)}`);
    }

    console.log(`\n### All SalesDelivery/SalesOrder around date 2026-07-08 (any buyer) ###`);
    const deliveriesOnDate = await prisma.salesDelivery.findMany({
        where: { date: { gte: new Date('2026-07-08T00:00:00Z'), lt: new Date('2026-07-09T00:00:00Z') } },
        orderBy: { deliveryNumber: 'asc' },
    });
    for (const d of deliveriesOnDate) {
        console.log(`  ${d.deliveryNumber} | inv=${d.invoiceNumber} | buyer=${d.buyerName} | isVoid=${d.isVoid}`);
    }

    console.log(`\n### All SalesOrder created/dated around 2026-07-08 for INTRADITA ###`);
    const ordersIntradita = await prisma.salesOrder.findMany({
        where: { buyerName: { contains: 'INTRADITA', mode: 'insensitive' } },
        orderBy: { date: 'asc' },
        include: { deliveries: true },
    });
    for (const o of ordersIntradita) {
        console.log(`  ${o.orderNumber} | proforma=${o.proformaNumber} | invoiceNumber=${o.invoiceNumber} | status=${o.status} | date=${o.date.toISOString().slice(0,10)} | deliveries=${o.deliveries.map(d=>`${d.deliveryNumber}(void=${d.isVoid})`).join(',')}`);
    }

    console.log(`\n### All SalesDelivery for INTRADITA ###`);
    const deliveriesIntradita = await prisma.salesDelivery.findMany({
        where: { buyerName: { contains: 'INTRADITA', mode: 'insensitive' } },
        orderBy: { date: 'asc' },
    });
    for (const d of deliveriesIntradita) {
        console.log(`  ${d.deliveryNumber} | inv=${d.invoiceNumber} | date=${d.date.toISOString().slice(0,10)} | isVoid=${d.isVoid} voidReason=${d.voidReason} | grandTotal=${d.grandTotal}`);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
