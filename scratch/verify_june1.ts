import { getComprehensiveWeeklyReportService } from '../src/lib/services/report-service';
async function main() {
    const data = await getComprehensiveWeeklyReportService('2026-06-01', 'ALL');
    const d1 = data?.dailyBreakdown?.find(d => d.dateLabel === '01 Jun');
    console.log("Weekly Report June 1st:", d1);
}
main().catch(console.error);
