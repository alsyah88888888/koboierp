import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // We assume the user is checking June 2026 based on previous context
    const startDate = new Date('2026-06-01T00:00:00Z');
    const endDate = new Date('2026-06-30T23:59:59Z');
    const prefix = 'BC'; // Or maybe ALL? Let's check both

    // 1. Fetch all OPERASIONAL transactions in June
    const allOps = await prisma.financeTransaction.findMany({
        where: {
            date: { gte: startDate, lte: endDate },
            category: 'OPERASIONAL'
        }
    });

    console.log(`Total Ops (Category='OPERASIONAL') in June:`, allOps.length, 'records');

    let sumOpsAll = 0;
    allOps.forEach(o => sumOpsAll += Number(o.amount));
    console.log(`Sum of all OPERASIONAL: ${sumOpsAll}`);

    // Let's see how many are unlinked
    const unlinkedOps = allOps.filter(o => !o.invoiceNumber);
    let sumUnlinked = 0;
    unlinkedOps.forEach(o => sumUnlinked += Number(o.amount));
    console.log(`Sum of UNLINKED OPERASIONAL: ${sumUnlinked} (${unlinkedOps.length} records)`);

    // 2. Fetch Traceability Ops logic (Sales Deliveries in June)
    const deliveries = await prisma.salesDelivery.findMany({
        where: { date: { gte: startDate, lte: endDate }, isVoid: false }
    });
    
    const invoiceNumbers = deliveries.map(d => d.invoiceNumber || d.deliveryNumber).filter(Boolean);
    
    const traceOps = await prisma.financeTransaction.findMany({
        where: {
            OR: invoiceNumbers.map(inv => ({ invoiceNumber: { contains: inv } })),
            category: { notIn: ["PEMBELIAN", "PENJUALAN", "TRANSFER"] }
        }
    });

    let sumTraceOps = 0;
    traceOps.forEach(o => sumTraceOps += Number(o.amount));
    console.log(`Sum of TRACEABILITY OPS (Linked to June Deliveries): ${sumTraceOps}`);

    // Wait, some traceOps might be from May or July!
    const traceOpsInJune = traceOps.filter(o => o.date >= startDate && o.date <= endDate);
    const traceOpsOutsideJune = traceOps.filter(o => o.date < startDate || o.date > endDate);
    console.log(`- TraceOps that are actually in June: ${traceOpsInJune.reduce((s, o) => s + Number(o.amount), 0)}`);
    console.log(`- TraceOps that are outside June: ${traceOpsOutsideJune.reduce((s, o) => s + Number(o.amount), 0)}`);

    // Let's check ops in June that are linked to Deliveries outside June
    const opsLinkedToOutside = allOps.filter(o => o.invoiceNumber && !traceOps.find(t => t.id === o.id));
    let sumLinkedOutside = 0;
    opsLinkedToOutside.forEach(o => sumLinkedOutside += Number(o.amount));
    console.log(`Sum of Ops in June but linked to Deliveries OUTSIDE June: ${sumLinkedOutside} (${opsLinkedToOutside.length} records)`);
    if (opsLinkedToOutside.length > 0) {
        console.log("Example:", opsLinkedToOutside[0].invoiceNumber, opsLinkedToOutside[0].date);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
