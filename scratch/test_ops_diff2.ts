import { getComprehensiveMonthlyReportService, calculateProductTraceabilityInternal } from '../src/lib/services/report-service';

async function main() {
    const d1 = await calculateProductTraceabilityInternal(new Date(2026,5,1), new Date(2026,5,30,23,59,59), 'PF');
    const d2 = await calculateProductTraceabilityInternal(new Date(2026,5,1), new Date(2026,5,30,23,59,59), 'BC');
    const d3 = await calculateProductTraceabilityInternal(new Date(2026,5,1), new Date(2026,5,30,23,59,59), 'ALL');
    
    const sum1 = d1.reduce((s, t) => s + Number(t['OPS (Rp)'] || 0), 0);
    const sum2 = d2.reduce((s, t) => s + Number(t['OPS (Rp)'] || 0), 0);
    const sum3 = d3.reduce((s, t) => s + Number(t['OPS (Rp)'] || 0), 0);
    
    console.log(`PF sum: ${sum1}`);
    console.log(`BC sum: ${sum2}`);
    console.log(`PF+BC sum: ${sum1+sum2}`);
    console.log(`ALL sum: ${sum3}`);
    
    const allRep = await getComprehensiveMonthlyReportService(6, 2026, 'ALL');
    console.log(`Report ALL sum: ${allRep.profitLoss.expenses}`);
}
main().catch(console.error);
