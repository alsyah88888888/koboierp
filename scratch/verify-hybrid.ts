import { PrismaClient } from '@prisma/client';
import { distributeOperationalCosts } from './src/lib/services/report-service';
const prisma = new PrismaClient();

async function fetchHybridOperationalData(prisma: any, startDate: Date, endDate: Date, deliveryInvoices: string[]) {
    const unlinkedOps = await prisma.financeTransaction.findMany({
        where: {
            date: { gte: startDate, lte: endDate },
            category: 'OPERASIONAL',
            OR: [{ invoiceNumber: null }, { invoiceNumber: '' }]
        },
        include: { createdBy: { select: { name: true } } },
        orderBy: { date: 'asc' }
    });

    const opsMap = new Map();
    unlinkedOps.forEach((op: any) => opsMap.set(op.id, op));

    if (deliveryInvoices.length > 0) {
        for (let i = 0; i < deliveryInvoices.length; i += 100) {
            const chunk = deliveryInvoices.slice(i, i + 100);
            const chunkOps = await prisma.financeTransaction.findMany({
                where: {
                    OR: chunk.map((inv: string) => ({ invoiceNumber: { contains: inv } })),
                    category: { notIn: ["PEMBELIAN", "PENJUALAN", "TRANSFER"] }
                },
                include: { createdBy: { select: { name: true } } }
            });
            chunkOps.forEach((op: any) => opsMap.set(op.id, op));
        }
    }

    return Array.from(opsMap.values()).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

async function main() {
    const startDate = new Date('2026-06-01T00:00:00Z');
    const endDate = new Date('2026-06-30T23:59:59Z');
    const prefix = 'BC';

    const sales = await prisma.salesDelivery.findMany({
        where: { date: { gte: startDate, lte: endDate }, isVoid: false, salesPerson: prefix },
        include: { items: { select: { quantity: true } } }
    });

    const deliveryInvoices = sales.map(s => s.invoiceNumber || s.deliveryNumber).filter(Boolean);
    const rawOps = await fetchHybridOperationalData(prisma, startDate, endDate, deliveryInvoices);
    
    let sumRawLinked = 0;
    let sumRawUnlinked = 0;
    rawOps.forEach(o => {
        if (o.invoiceNumber) sumRawLinked += Number(o.amount);
        else sumRawUnlinked += Number(o.amount);
    });
    console.log("RAW HYBRID (Before Distribute):");
    console.log("  Linked:", sumRawLinked);
    console.log("  Unlinked:", sumRawUnlinked);

    const operational = await distributeOperationalCosts(rawOps, prefix);
    
    let sumLinked = 0;
    let sumUnlinked = 0;
    
    for (const ops of operational) {
        if (ops.invoiceNumber) {
            sumLinked += Number(ops.amount);
        } else {
            sumUnlinked += Number(ops.amount);
        }
    }

    console.log("AFTER DISTRIBUTE:");
    console.log("  Linked (Should match Traceability):", sumLinked);
    console.log("  Unlinked (Overhead):", sumUnlinked);
    console.log("  Total Detail Ops:", sumLinked + sumUnlinked);
}

main().catch(console.error).finally(() => prisma.$disconnect());
