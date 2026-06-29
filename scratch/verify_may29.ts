import { getComprehensiveDailyReportService } from '../src/lib/services/report-service';
async function main() {
    // We are looking for KB-TRN-29052026-006 and KB-TRN-29052026-003
    // Date should be around May 29. Let's fetch Traceability for May 29.
    const data = await getComprehensiveDailyReportService('2026-05-29', 'ALL');
    const sales = data.details?.sales || [];
    
    let totalOps = 0;
    
    // We can also check the Traceability directly
    // Wait, getComprehensiveDailyReportService returns `data.details.sales`. 
    // Traceability is actually `data.traceability` or we can call `calculateProductTraceabilityInternal` directly.
    const trace = data.traceability || [];
    
    const rows = trace.filter((r: any) => r['NOMOR SJ'] === 'KB-TRN-29052026-006' || r['NOMOR SJ'] === 'KB-TRN-29052026-003' || r['NOMOR FAKTUR PENJUALAN'].includes('KB-TRN-29052026-006') || r['NOMOR FAKTUR PENJUALAN'].includes('KB-TRN-29052026-003'));
    
    console.log("Matching Rows:", rows.length);
    rows.forEach((r: any) => {
        console.log(`SJ: ${r['NOMOR SJ']}, Qty: ${r['QTY JUAL']}, Ops: ${r['OPS']}`);
        totalOps += r['OPS'];
    });
    
    console.log("Total Ops in UI:", totalOps);
}
main().catch(console.error);
