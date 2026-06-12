import { getComprehensiveDailyReportService } from '../src/lib/services/report-service';

async function test() {
    try {
        const result = await getComprehensiveDailyReportService('2026-06-12', 'ALL');
        console.log('Purchases Count:', result.details?.purchases?.length);
        console.log('Purchases Total Value:', result.summary?.totalPurchases);
        console.log('Purchases Details:', result.details?.purchases?.map((p: any) => ({ number: p.number, supplier: p.supplier, grandTotal: p.grandTotal })));
    } catch (err) {
        console.error('Error:', err);
    }
}

test();
