import { PrismaClient } from '@prisma/client';
import { calculateProductTraceabilityInternal } from '../src/lib/services/report-service.ts';

const prisma = new PrismaClient();

async function main() {
    const startDate = new Date(2026, 5, 1);
    const endDate = new Date(2026, 6, 0, 23, 59, 59, 999);

    const traceRows = await calculateProductTraceabilityInternal(startDate, endDate, 'ALL');
    
    let traceTotal = 0;
    const traceDeliveryTotals = new Map<string, number>();

    for (const r of traceRows) {
        if (r['NOMOR SJ']) {
            traceTotal += Number(r['TOTAL JUAL'] || 0);
            traceDeliveryTotals.set(r['NOMOR SJ'], (traceDeliveryTotals.get(r['NOMOR SJ']) || 0) + Number(r['TOTAL JUAL'] || 0));
        }
    }

    const sales = await prisma.salesDelivery.findMany({
        where: { isVoid: false, date: { gte: startDate, lte: endDate } }
    });

    let grandTotalSum = 0;
    for (const sd of sales) {
        grandTotalSum += Number(sd.grandTotal || 0);
        const tTotal = traceDeliveryTotals.get(sd.deliveryNumber) || 0;
        
        if (Math.abs(Number(sd.grandTotal || 0) - tTotal) > 10) {
            console.log(`Mismatch on ${sd.deliveryNumber}: GrandTotal=${sd.grandTotal} vs TraceTotal=${tTotal}`);
        }
    }

    console.log(`Trace Total Jual: ${traceTotal}`);
    console.log(`GrandTotal Sum: ${grandTotalSum}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
