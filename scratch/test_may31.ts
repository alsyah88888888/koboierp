import { getComprehensiveWeeklyReportService } from '../src/lib/services/report-service';
async function main() {
    const data = await getComprehensiveWeeklyReportService('2026-05-31', 'ALL');
    console.log(JSON.stringify(data.dailyBreakdown.map(d => ({ date: d.dateLabel, sales: d.sales })), null, 2));
}
main().catch(console.error);
