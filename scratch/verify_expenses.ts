import { getComprehensiveDailyReportService } from '../src/lib/services/report-service';

async function main() {
    const data = await getComprehensiveDailyReportService('2026-06-02', 'ALL');
    if ('error' in data) {
        console.error("Error fetching report for June 2:", data.error);
    } else {
        console.log("Summary for June 2:", data.summary);
        console.log("Operational/Expenses details for June 2:", data.details.operational);
    }
    
    const data3 = await getComprehensiveDailyReportService('2026-06-03', 'ALL');
    if ('error' in data3) {
        console.error("Error fetching report for June 3:", data3.error);
    } else {
        console.log("Summary for June 3:", data3.summary);
        console.log("Operational/Expenses details for June 3:", data3.details.operational);
    }
}

main().catch(console.error);
