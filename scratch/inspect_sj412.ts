import { getComprehensiveMonthlyReportService } from '@/lib/services/report-service';

async function main() {
  const data: any = await getComprehensiveMonthlyReportService(6, 2026, 'PF');
  const rows = data.details.monthlyTraceability as any[];
  const hit = rows.filter((t: any) => t['NOMOR SJ'] === 'SJ-412-01062026-001');
  console.log('Jumlah baris untuk SJ-412-01062026-001 di Traceability Juni/PF:', hit.length);
  hit.forEach(t => console.log(JSON.stringify({ item: t['KETERANGAN ITEM'], qty: t['QTY JUAL'], ops: t['OPS'], detailOps: t['DETAIL OPS'], tglJual: t['TANGGAL JUAL'], sales: t['SALES'] })));

  // Also check with prefix ALL in case PF-exact-match filter drops it
  const dataAll: any = await getComprehensiveMonthlyReportService(6, 2026, 'ALL');
  const rowsAll = dataAll.details.monthlyTraceability as any[];
  const hitAll = rowsAll.filter((t: any) => t['NOMOR SJ'] === 'SJ-412-01062026-001');
  console.log('\nJumlah baris untuk SJ-412-01062026-001 di Traceability Juni/ALL:', hitAll.length);
  hitAll.forEach(t => console.log(JSON.stringify({ item: t['KETERANGAN ITEM'], qty: t['QTY JUAL'], ops: t['OPS'], detailOps: t['DETAIL OPS'], tglJual: t['TANGGAL JUAL'], sales: t['SALES'] })));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
