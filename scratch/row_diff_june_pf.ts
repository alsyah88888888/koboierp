import { getComprehensiveMonthlyReportService } from '@/lib/services/report-service';

async function main() {
  const data: any = await getComprehensiveMonthlyReportService(6, 2026, 'PF');
  const opsDetail = data.details.operational as any[];
  const monthlyTraceability = data.details.monthlyTraceability as any[];

  // Group Detail Operasional by PR code embedded in description/referenceNumber
  const prRegex = /(KB-PR-\d{8}-\d{3})/;
  const detailByPR = new Map<string, number>();
  for (const o of opsDetail) {
    const m = (o.description || '').match(prRegex);
    const key = m ? m[1] : `NOPR:${o.referenceNumber}`;
    detailByPR.set(key, (detailByPR.get(key) || 0) + Number(o.amount || 0));
  }

  const traceByPR = new Map<string, number>();
  for (const t of monthlyTraceability) {
    const ops = Number(t['OPS'] || 0);
    if (ops === 0) continue;
    const detailStr = t['DETAIL OPS'] || '';
    const matches = [...detailStr.matchAll(/(KB-PR-\d{8}-\d{3})/g)].map(m => m[1]);
    if (matches.length === 0) { traceByPR.set(`NOPR:${detailStr}`, (traceByPR.get(`NOPR:${detailStr}`)||0) + ops); continue; }
    // if multiple PR codes bundled in one detail string, we can't split further here; attribute fully to combined key
    const key = matches.join('+');
    traceByPR.set(key, (traceByPR.get(key) || 0) + ops);
  }

  console.log('Jumlah PR unik di Detail Operasional:', detailByPR.size);
  console.log('Jumlah PR/kombinasi unik di Traceability:', traceByPR.size);

  console.log('\n=== PR yang ada di Detail Operasional tapi TIDAK match persis di Traceability (atau beda nilai) ===');
  let totalDiff = 0;
  for (const [pr, amt] of detailByPR) {
    const traceAmt = traceByPR.get(pr) ?? null;
    if (traceAmt === null || Math.abs(traceAmt - amt) > 1) {
      console.log(pr, '| DetailOps:', amt, '| TraceOps:', traceAmt, '| diff:', amt - (traceAmt || 0));
      totalDiff += amt - (traceAmt || 0);
    }
  }
  console.log('\nTotal selisih dari baris yang tidak match:', totalDiff);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
