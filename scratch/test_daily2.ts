import { getComprehensiveDailyReportService } from '../src/lib/services/report-service';
async function main() {
    const data = await getComprehensiveDailyReportService('2026-06-01', 'ALL');
    console.log("Daily Report top level keys:", Object.keys(data));
    console.log("summary:", data.summary);
}
main().catch(console.error);
