import { getComprehensiveMonthlyReportService } from '@/lib/services/report-service';

async function run(prefix: 'PF' | 'BC') {
  const data: any = await getComprehensiveMonthlyReportService(6, 2026, prefix);
  const opsDetail = data.details.operational as any[];
  const monthlyTraceability = data.details.monthlyTraceability as any[];
  const detailOpsTotal = opsDetail.reduce((s, o) => s + Number(o.amount || 0), 0);
  const traceOpsTotal = monthlyTraceability.reduce((s, t) => s + Number(t['OPS'] || 0), 0);

  // "unlinked" rows = original raw op had no invoiceNumber (this is the field fetchHybridOperationalData actually branches on)
  const unlinked = opsDetail.filter(o => !o.invoiceNumber);
  const unlinkedTotal = unlinked.reduce((s, o) => s + Number(o.amount || 0), 0);

  console.log(`\n## JUNI ${prefix}: DetailOps=${detailOpsTotal} TraceOps=${traceOpsTotal} Selisih=${detailOpsTotal - traceOpsTotal} | UnlinkedOpsTotal=${unlinkedTotal} (${unlinked.length} baris)`);
  console.log('Selisih - UnlinkedOpsTotal =', (detailOpsTotal - traceOpsTotal) - unlinkedTotal, '(harusnya mendekati 0 kalau gap murni dari unlinked ops)');
}

async function main() {
  await run('BC');
  await run('PF');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
