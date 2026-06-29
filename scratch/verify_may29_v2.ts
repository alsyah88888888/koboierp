import { getComprehensiveDailyReportService } from '../src/lib/services/report-service';
async function main() {
    const data = await getComprehensiveDailyReportService('2026-05-29', 'ALL');
    const trace = data.details?.dailyTraceability || [];
    
    const rows = trace.filter((r: any) => r['NOMOR SJ'] === 'KB-TRN-29052026-006' || r['NOMOR SJ'] === 'KB-TRN-29052026-003' || r['NOMOR FAKTUR PENJUALAN'].includes('KB-TRN-29052026-006') || r['NOMOR FAKTUR PENJUALAN'].includes('KB-TRN-29052026-003'));
    
    let totalOps = 0;
    console.log("Matching Rows:", rows.length);
    rows.forEach((r: any) => {
        console.log(`SJ: ${r['NOMOR SJ']}, Qty: ${r['QTY JUAL']}, Ops: ${r['OPS']}`);
        totalOps += r['OPS'];
    });
    
    console.log("Total Ops in UI:", totalOps);
}
main().catch(console.error);
