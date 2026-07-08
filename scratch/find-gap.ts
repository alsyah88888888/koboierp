import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { distributeOperationalCosts } from './src/lib/services/report-service';

async function main() {
    const startDate = new Date('2026-06-01T00:00:00Z');
    const endDate = new Date('2026-06-30T23:59:59Z');

    const sales = await prisma.salesDelivery.findMany({
        where: { date: { gte: startDate, lte: endDate }, isVoid: false, salesPerson: 'BC' },
        include: { items: { select: { quantity: true } } }
    });
    
    const deliveryInvoices = sales.map(s => s.invoiceNumber || s.deliveryNumber).filter(Boolean);

    // Replicate fetchHybridOperationalData logic exactly
    const unlinkedOps = await prisma.financeTransaction.findMany({
        where: {
            date: { gte: startDate, lte: endDate },
            category: 'OPERASIONAL',
            OR: [{ invoiceNumber: null }, { invoiceNumber: '' }]
        }
    });

    const opsMap = new Map();
    unlinkedOps.forEach((op: any) => opsMap.set(op.id, op));

    for (let i = 0; i < deliveryInvoices.length; i += 100) {
        const chunk = deliveryInvoices.slice(i, i + 100);
        const chunkOps = await prisma.financeTransaction.findMany({
            where: {
                OR: chunk.map((inv: string) => ({ invoiceNumber: { contains: inv } })),
                category: { notIn: ["PEMBELIAN", "PENJUALAN", "TRANSFER"] }
            }
        });
        chunkOps.forEach((op: any) => opsMap.set(op.id, op));
    }

    const rawOperational = Array.from(opsMap.values()).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const operational = await distributeOperationalCosts(rawOperational, 'BC');
    
    let sumLinked = 0;
    let sumUnlinked = 0;
    
    operational.forEach(op => {
        if (!op.invoiceNumber) {
            sumUnlinked += Number(op.amount);
            console.log(`Unlinked: ${op.date} | ${op.amount} | ${op.description}`);
        } else {
            sumLinked += Number(op.amount);
        }
    });
    
    console.log(`\nLinked Total: ${sumLinked}`);
    console.log(`Unlinked Total: ${sumUnlinked}`);
    console.log(`Grand Total: ${sumLinked + sumUnlinked}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
