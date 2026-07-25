import { getComprehensiveMonthlyReportService } from '@/lib/services/report-service';

const targets = ['SJ-519-04062026-003', 'SJ-444-13052026-007', 'SJ-444-04062026-003'];

async function scan(month: number, year: number) {
  const data: any = await getComprehensiveMonthlyReportService(month, year, 'ALL');
  const rows = data.details.monthlyTraceability as any[];
  for (const t of rows) {
    if (targets.includes(t['NOMOR SJ'])) {
      console.log({
        bulan: `${month}/${year}`,
        sj: t['NOMOR SJ'],
        tglJual: t['TANGGAL JUAL'],
        sales: t['SALES'],
        pembeli: t['NAMA PEMBELI'],
        item: t['KETERANGAN ITEM'],
        qtyJual: t['QTY JUAL'],
        ops: t['OPS'],
        detailOps: t['DETAIL OPS'],
      });
    }
  }
}

async function main() {
  await scan(5, 2026);
  await scan(6, 2026);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
