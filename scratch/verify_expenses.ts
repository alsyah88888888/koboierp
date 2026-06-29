import { getComprehensiveDailyReportService } from '../src/lib/services/report-service';
async function main() {
    const data = await getComprehensiveDailyReportService('2026-06-02', 'ALL');
    console.log("Daily Report for June 2:", data.expenses);
    
    const data3 = await getComprehensiveDailyReportService('2026-06-03', 'ALL');
    console.log("Daily Report for June 3:", data3.expenses);
}
main().catch(console.error);
