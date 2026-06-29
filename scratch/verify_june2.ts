import { getComprehensiveDailyReportService } from '../src/lib/services/report-service';
async function main() {
    const data = await getComprehensiveDailyReportService('2026-06-02', 'ALL');
    const sales = data.details?.sales || [];
    const t001 = sales.find((s:any) => s.number === 'KB-TRN-02062026-001');
    const t002 = sales.find((s:any) => s.number === 'KB-TRN-02062026-002');
    console.log("Traceability for -001:", t001);
    console.log("Traceability for -002:", t002);
}
main().catch(console.error);
