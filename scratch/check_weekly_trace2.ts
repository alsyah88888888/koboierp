import { getComprehensiveWeeklyReportService } from '../src/lib/services/report-service';
async function main() {
    const data = await getComprehensiveWeeklyReportService('2026-06-22', 'ALL');
    console.log("Weekly data keys:", Object.keys(data));
    if (data.details) {
        console.log("details keys:", Object.keys(data.details));
    }
}
main().catch(console.error);
