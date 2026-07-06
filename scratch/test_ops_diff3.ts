import { getComprehensiveMonthlyReportService } from '../src/lib/services/report-service';

async function main() {
    const pf: any = await getComprehensiveMonthlyReportService(6, 2026, 'PF');
    const bc: any = await getComprehensiveMonthlyReportService(6, 2026, 'BC');
    const all: any = await getComprehensiveMonthlyReportService(6, 2026, 'ALL');
    
    // We compute what generalOps was by repeating the logic inside the service
    console.log(`PF Total Exp: ${pf.profitLoss.expenses}`);
    console.log(`BC Total Exp: ${bc.profitLoss.expenses}`);
    console.log(`PF+BC Total Exp: ${pf.profitLoss.expenses + bc.profitLoss.expenses}`);
    console.log(`ALL Total Exp: ${all.profitLoss.expenses}`);
    
    // Sum of OPS directly from monthlyTraceability
    const pfOps = pf.details.monthlyTraceability.reduce((s: number, t: any) => s + Number(t['OPS'] || 0), 0);
    const bcOps = bc.details.monthlyTraceability.reduce((s: number, t: any) => s + Number(t['OPS'] || 0), 0);
    const allOps = all.details.monthlyTraceability.reduce((s: number, t: any) => s + Number(t['OPS'] || 0), 0);
    
    console.log(`PF OPS: ${pfOps}`);
    console.log(`BC OPS: ${bcOps}`);
    console.log(`PF+BC OPS: ${pfOps + bcOps}`);
    console.log(`ALL OPS: ${allOps}`);
}
main().catch(console.error);
