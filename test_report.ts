import { getBatchTraceabilityService } from './src/lib/services/report-service';

async function run() {
    try {
        const filterYear = 2026;
        const filterMonth = 7;
        const startDate = new Date(filterYear, filterMonth - 1, 1);
        const endDate = new Date(filterYear, filterMonth, 0, 23, 59, 59, 999);
        
        console.log("Calling getBatchTraceabilityService...");
        const res = await getBatchTraceabilityService({ startDate, endDate });
        console.log("Result length:", res.length);
        if (res.length > 0) {
            console.log("First item NO:", res[0].NO);
        }
    } catch (e) {
        console.error("ERROR CAUGHT:");
        console.error(e);
    }
}
run();
