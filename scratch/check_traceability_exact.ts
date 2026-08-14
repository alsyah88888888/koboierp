import { PrismaClient } from '@prisma/client';
import { fetchHybridOperationalData, calculateProductTraceabilityInternal } from '../src/lib/services/report-service';

async function main() {
    const prisma = new PrismaClient();
    const startDate = new Date('2026-07-01');
    const endDate = new Date('2026-07-31T23:59:59.999Z');
    
    const monthlyTraceability = await calculateProductTraceabilityInternal(startDate, endDate);
    const traceabilityOps = monthlyTraceability.reduce((sum: number, t: any) => sum + Number(t.OPS || 0), 0);
    console.log("Traceability Ops (Accrual):", traceabilityOps);
    
    const rawOperational = await fetchHybridOperationalData(prisma, startDate, endDate);
    
    const expenses = rawOperational.filter((o: any) =>
        o.transactionType === 'PAYMENT' || o.transactionType === 'EXPENSE' || Number(o.amount) < 0
    );
    
    const cashFlowExpenses = expenses.reduce((s: number, o: any) => s + Math.abs(Number(o.amount || 0)), 0);
    console.log("Detail Operasional (Cash Out):", cashFlowExpenses);
    
    const traceDeliverySet = new Set(monthlyTraceability.map((t: any) => t['NOMOR SJ']).filter(Boolean));
    
    let linkedCash = 0;
    let unlinkedCash = 0;
    
    expenses.forEach((o: any) => {
        const sourceDeliveryNumber = o._sourceDeliveryNumber || null;
        const adaDiTraceability = !!(sourceDeliveryNumber && traceDeliverySet.has(sourceDeliveryNumber));
        
        if (adaDiTraceability) {
            linkedCash += Math.abs(Number(o.amount || 0));
        } else {
            unlinkedCash += Math.abs(Number(o.amount || 0));
        }
    });
    
    console.log("Cash Out - Ada di Traceability:", linkedCash);
    console.log("Cash Out - Belum di Traceability:", unlinkedCash);
}

main().finally(() => process.exit(0));
