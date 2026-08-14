import { PrismaClient } from '@prisma/client';
import { getComprehensiveMonthlyReportService, fetchHybridOperationalData, calculateProductTraceabilityInternal } from '../src/lib/services/report-service';

async function main() {
    const prisma = new PrismaClient();
    const startDate = new Date('2026-07-01');
    const endDate = new Date('2026-07-31T23:59:59.999Z');
    
    const rawOperational = await fetchHybridOperationalData(prisma, startDate, endDate);
    const expenses = rawOperational.filter((o: any) =>
        o.transactionType === 'PAYMENT' || o.transactionType === 'EXPENSE' || Number(o.amount) < 0
    );
    
    const cashFlowExpenses = expenses.reduce((s: number, o: any) => s + Math.abs(Number(o.amount || 0)), 0);
    console.log("TOTAL DETAIL OPERASIONAL (CASH OUT JULI):", cashFlowExpenses);
    
    const monthlyTraceability = await calculateProductTraceabilityInternal(startDate, endDate);
    const traceabilityOps = monthlyTraceability.reduce((sum: number, t: any) => sum + Number(t.OPS || 0), 0);
    console.log("TOTAL OPS TRACEABILITY (ACCRUAL JULI):", Math.abs(traceabilityOps));
    
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
    
    console.log("CASH OUT - ADA DI TRACEABILITY (LINKED):", linkedCash);
    console.log("CASH OUT - BELUM DI TRACEABILITY (UNLINKED):", unlinkedCash);
    console.log("SUM OF CASH OUT:", linkedCash + unlinkedCash);
}

main().finally(() => process.exit(0));
