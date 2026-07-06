import { PrismaClient } from '@prisma/client';
import { calculateProductTraceabilityInternal } from '../src/lib/services/report-service';

async function main() {
    const filterMonth = 6;
    const filterYear = 2026;
    const startDate = new Date(filterYear, filterMonth - 1, 1);
    const endDate = new Date(filterYear, filterMonth, 0, 23, 59, 59);
    
    const pf = await calculateProductTraceabilityInternal(startDate, endDate, 'PF');
    const bc = await calculateProductTraceabilityInternal(startDate, endDate, 'BC');
    const all = await calculateProductTraceabilityInternal(startDate, endDate, 'ALL');

    const sumMap = new Map<string, { pf: number, bc: number, all: number }>();
    
    const addToMap = (items: any[], type: 'pf'|'bc'|'all') => {
        for (const item of items) {
            const inv = item['NOMOR SJ'];
            if (!inv || inv === '-') continue;
            if (!sumMap.has(inv)) sumMap.set(inv, { pf: 0, bc: 0, all: 0 });
            sumMap.get(inv)![type] += Number(item['OPS (Rp)'] || 0);
        }
    };
    
    addToMap(pf, 'pf');
    addToMap(bc, 'bc');
    addToMap(all, 'all');

    let totalDiff = 0;
    for (const [inv, data] of sumMap.entries()) {
        const pfbc = data.pf + data.bc;
        if (Math.abs(pfbc - data.all) > 100) {
            console.log(`Difference in ${inv}: PF+BC=${pfbc} (PF=${data.pf}, BC=${data.bc}) vs ALL=${data.all} -> Diff: ${pfbc - data.all}`);
            totalDiff += (pfbc - data.all);
        }
    }
    console.log(`Total Difference: ${totalDiff}`);
}
main().catch(console.error);
