import { calculateProductTraceabilityInternal } from '../src/lib/services/report-service';

async function main() {
    const d1 = await calculateProductTraceabilityInternal(new Date(2026,5,1), new Date(2026,5,30,23,59,59), 'PF');
    const d2 = await calculateProductTraceabilityInternal(new Date(2026,5,1), new Date(2026,5,30,23,59,59), 'BC');
    const d3 = await calculateProductTraceabilityInternal(new Date(2026,5,1), new Date(2026,5,30,23,59,59), 'ALL');
    
    const sumMap = new Map<string, { pf: number, bc: number, all: number }>();
    
    const addToMap = (items: any[], type: 'pf'|'bc'|'all') => {
        for (const item of items) {
            const inv = item['NOMOR SJ'];
            if (!inv || inv === '-') continue;
            if (!sumMap.has(inv)) sumMap.set(inv, { pf: 0, bc: 0, all: 0 });
            sumMap.get(inv)![type] += Number(item['OPS'] || 0);
        }
    };
    
    addToMap(d1, 'pf');
    addToMap(d2, 'bc');
    addToMap(d3, 'all');

    let totalDiff = 0;
    for (const [inv, data] of sumMap.entries()) {
        const pfbc = data.pf + data.bc;
        if (Math.abs(pfbc - data.all) > 100) {
            console.log(`Difference in ${inv}: PF=${data.pf}, BC=${data.bc}, PF+BC=${pfbc} vs ALL=${data.all} -> Diff: ${pfbc - data.all}`);
            totalDiff += (pfbc - data.all);
        }
    }
    console.log(`Total Difference: ${totalDiff}`);
}
main().catch(console.error);
