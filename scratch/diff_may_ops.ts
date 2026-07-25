import { getComprehensiveMonthlyReportService } from '@/lib/services/report-service';

async function run(prefix: 'PF' | 'BC' | 'ALL') {
  const data: any = await getComprehensiveMonthlyReportService(5, 2026, prefix);

  const opsDetail = data.details.operational as any[];
  const monthlyTraceability = data.details.monthlyTraceability as any[];

  const detailOpsTotal = opsDetail.reduce((s, o) => s + Number(o.amount || 0), 0);
  const traceOpsTotal = monthlyTraceability.reduce((s, t) => s + Number(t['OPS'] || 0), 0);

  console.log(`\n########## PREFIX=${prefix} ##########`);
  console.log('Detail Operasional total (sum sheet):', detailOpsTotal);
  console.log('Traceability OPS total (sum sheet):', traceOpsTotal);
  console.log('Selisih:', detailOpsTotal - traceOpsTotal);
  console.log('Jumlah baris Detail Operasional:', opsDetail.length, '| Jumlah baris Traceability (OPS!=0):', monthlyTraceability.filter(t => Number(t['OPS'] || 0) !== 0).length);
}

async function dumpBC() {
  const data: any = await getComprehensiveMonthlyReportService(5, 2026, 'BC');
  const opsDetail = data.details.operational as any[];
  const monthlyTraceability = data.details.monthlyTraceability as any[];

  console.log('\n=== Detail Operasional rows (BC), total', opsDetail.reduce((s,o)=>s+Number(o.amount||0),0), '===');
  opsDetail.forEach(o => console.log(o.date?.toString().slice(0,10), '|', o.bank, '|', o.amount, '|', o.referenceNumber, '|', (o.description||'').replace(/\n/g,' ').slice(0,90)));

  // Group traceability OPS by NOMOR SJ (delivery number) to compare against PR-linked detail rows
  const byDelivery = new Map<string, { ops: number; detail: string; buyer: string; tglJual: string }>();
  for (const t of monthlyTraceability) {
    const key = t['NOMOR SJ'] || '-';
    const ops = Number(t['OPS'] || 0);
    if (!byDelivery.has(key)) byDelivery.set(key, { ops: 0, detail: t['DETAIL OPS'], buyer: t['NAMA PEMBELI'], tglJual: t['TANGGAL JUAL'] });
    byDelivery.get(key)!.ops += ops;
  }
  console.log('\n=== Traceability OPS grouped per NOMOR SJ (BC), total', [...byDelivery.values()].reduce((s,v)=>s+v.ops,0), '===');
  for (const [sj, v] of byDelivery) {
    if (v.ops !== 0) console.log(sj, '|', v.tglJual, '|', v.buyer, '|', v.ops, '|', v.detail);
  }
}

async function main() {
  await run('ALL');
  await run('PF');
  await run('BC');
  await dumpBC();
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
