const { getComprehensiveWeeklyReportService } = require('./src/lib/services/report-service.ts');
require('ts-node').register();
const service = require('./src/lib/services/report-service.ts');
async function main() {
    const data = await service.getComprehensiveWeeklyReportService('2026-06-22', 'ALL');
    console.log(Object.keys(data));
    if (data.details) {
        console.log("details keys:", Object.keys(data.details));
    }
}
main().catch(console.error);
