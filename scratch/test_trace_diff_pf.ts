import { PrismaClient } from '@prisma/client';
import { calculateProductTraceabilityInternal } from '../src/lib/services/report-service.ts';

const prisma = new PrismaClient();

async function main() {
    const startDate = new Date(2026, 5, 1);
    const endDate = new Date(2026, 6, 0, 23, 59, 59, 999);

    // 1. Run ALL and filter
    const traceAll = await calculateProductTraceabilityInternal(startDate, endDate, 'ALL');
    let allFilteredPF = 0;
    for (const r of traceAll) {
        if (r['SALES'] === 'PF') {
            allFilteredPF += Number(r['TOTAL JUAL'] || 0);
        }
    }

    // 2. Run just PF
    const tracePF = await calculateProductTraceabilityInternal(startDate, endDate, 'PF');
    let justPF = 0;
    for (const r of tracePF) {
        justPF += Number(r['TOTAL JUAL'] || 0);
    }

    console.log(`ALL filtered PF: ${allFilteredPF}`);
    console.log(`Just PF        : ${justPF}`);
    console.log(`Difference     : ${allFilteredPF - justPF}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
