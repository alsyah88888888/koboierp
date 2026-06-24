import { getComprehensiveDailyReportService } from '../src/lib/services/report-service';
async function main() {
    const data = await getComprehensiveDailyReportService('2026-06-01', 'ALL');
    console.log("Daily Report Sales Count:", data.salesCount);
    console.log("Daily Report Sales Total:", data.salesTotal);
}
main().catch(console.error);
