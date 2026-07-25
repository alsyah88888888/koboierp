import { getComprehensiveMonthlyReportService } from '@/lib/services/report-service';

async function run(prefix: 'PF' | 'BC' | 'ALL') {
  const data: any = await getComprehensiveMonthlyReportService(6, 2026, prefix);
  const opsDetail = data.details.operational as any[];
  const monthlyTraceability = data.details.monthlyTraceability as any[];
  const detailOpsTotal = opsDetail.reduce((s, o) => s + Number(o.amount || 0), 0);
  const traceOpsTotal = monthlyTraceability.reduce((s, t) => s + Number(t['OPS'] || 0), 0);
  console.log(`\n## JUNI PREFIX=${prefix}: DetailOps=${detailOpsTotal} TraceOps=${traceOpsTotal} Selisih=${detailOpsTotal - traceOpsTotal}`);
  const hit = opsDetail.filter(o => (o.referenceNumber || '').includes('20260604-003') || (o.description || '').includes('20260604-003'));
  hit.forEach(o => console.log('  >', o.date, '|', o.amount, '|', o.referenceNumber));
}

async function main() {
  await run('BC');
  await run('PF');
  await run('ALL');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
