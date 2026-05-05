const { getPrisma } = require("./src/lib/prisma");
const { getMonthlyClosingReportService } = require("./src/lib/services/report-service");

async function testReport() {
    console.log("Testing Monthly Closing Report for May 2026...");
    try {
        const report = await getMonthlyClosingReportService(5, 2026);
        console.log("Report Result:", JSON.stringify(report, null, 2));
    } catch (err) {
        console.error("Report Error:", err);
    }
}

testReport();
