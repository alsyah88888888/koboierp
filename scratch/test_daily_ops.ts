import { getComprehensiveDailyReportService } from '../src/lib/services/report-service';
async function main() {
    const data = await getComprehensiveDailyReportService('2026-06-01', 'ALL');
    console.log("Daily Ops:", data.summary.totalExpense, data.summary.opsCount);
}
main().catch(console.error);
