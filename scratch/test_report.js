const { getComprehensiveWeeklyReportService } = require('./src/lib/services/report-service.ts');
require('ts-node').register();
const service = require('./src/lib/services/report-service.ts');

async function main() {
    const data = await service.getComprehensiveWeeklyReportService(null, 'ALL');
    console.log(data.dailyBreakdown.map(d => ({ date: d.date, opsExpense: d.opsExpense })));
}

main().catch(console.error);
