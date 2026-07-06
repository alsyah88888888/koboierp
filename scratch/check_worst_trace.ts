import { calculateProductTraceabilityInternal } from '../src/lib/services/report-service.ts';

async function main() {
    const startDate = new Date(2026, 5, 1);
    const endDate = new Date(2026, 6, 0, 23, 59, 59, 999);
    const traceAll = await calculateProductTraceabilityInternal(startDate, endDate, 'ALL');
    
    const worst = traceAll.sort((a, b) => a['MARGIN'] - b['MARGIN']).slice(0, 10);
    console.log('--- WORST MARGIN ITEMS ---');
    for (const r of worst) {
        console.log(`SJ: ${r['NOMOR SJ']}, ${r['NAMA BARANG']} (Qty Jual: ${r['QTY JUAL']}, Qty Beli: ${r['QTY BELI']}): Margin ${r['MARGIN']}. Jual: ${r['TOTAL JUAL']}, Beli: ${r['TOTAL BELI']}. HPP: ${r['HARGA BELI']}`);
    }
}
main().catch(console.error);
