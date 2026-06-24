import { getComprehensiveWeeklyReportService } from './src/lib/services/report-service';
async function main() {
    const data = await getComprehensiveWeeklyReportService(undefined, 'ALL');
    console.log(JSON.stringify(data.dailyBreakdown.map(d => ({ date: d.date, day: d.dayName, ops: d.opsExpense })), null, 2));
}
main().catch(console.error);
