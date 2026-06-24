import { getProductTraceabilityService } from '../src/lib/services/report-service';
async function main() {
    const data = await getProductTraceabilityService(6, 2026);
    console.log("Keys of first trace row:", Object.keys(data[0]));
}
main().catch(console.error);
