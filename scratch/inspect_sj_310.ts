import { getProductTraceabilityService } from '../src/lib/services/report-service';

async function main() {
  const data = await getProductTraceabilityService(6, 2026);
  if ('error' in data) {
    console.error(data.error);
    return;
  }
  const sjRows = data.filter((row: any) => row['NOMOR SJ'] === 'SJ-310-11062026-001' || row['NOMOR FAKTUR PENJUALAN'] === 'SJ-310-11062026-001');
  console.log("Traceability Report Rows for SJ-310-11062026-001:");
  console.log(JSON.stringify(sjRows, null, 2));
}

main().catch(console.error);
