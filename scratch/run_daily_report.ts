import { getComprehensiveDailyReportService } from '../src/lib/services/report-service';

async function test() {
    try {
        const result = await getComprehensiveDailyReportService('2026-06-12', 'ALL');
        console.log('Daily Report Sales Count:', result.details?.sales?.length);
        console.log('Daily Report Sales Numbers:', result.details?.sales?.map((s: any) => s.number));
    } catch (err) {
        console.error('Error:', err);
    }
}

test();
