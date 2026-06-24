import { getComprehensiveWeeklyReportService } from '../src/lib/services/report-service';
async function main() {
    const data = await getComprehensiveWeeklyReportService('2026-06-22', 'ALL');
    console.log(JSON.stringify(data.dailyBreakdown.map(d => ({ date: d.dateLabel, day: d.dayName, sales: d.sales })), null, 2));
}
main().catch(console.error);
