// Use CommonJS to avoid Next.js ESM path resolution issues in scratch scripts
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function calculateProductTraceabilityInternal(startDate, endDate, prefix) {
    const isAll = !prefix || prefix === 'ALL';
    // We don't even need to call the exact service, we can import it using ts-node dynamically
}

async function main() {
    // We can register tsconfig-paths dynamically
    require('tsconfig-paths').register({
        baseUrl: './',
        paths: { '@/lib/*': ['src/lib/*'] }
    });


    const { getComprehensiveMonthlyReportService } = require('../src/lib/services/report-service');
    
    const pf = await getComprehensiveMonthlyReportService(6, 2026, 'PF');
    const bc = await getComprehensiveMonthlyReportService(6, 2026, 'BC');
    const all = await getComprehensiveMonthlyReportService(6, 2026, 'ALL');
    
    console.log('=== PENJUALAN ===');
    console.log('PF:', pf.summary.totalSales);
    console.log('BC:', bc.summary.totalSales);
    console.log('PF+BC:', pf.summary.totalSales + bc.summary.totalSales);
    console.log('ALL:', all.summary.totalSales);
    
    console.log('=== HPP ===');
    console.log('PF:', pf.summary.totalHPP);
    console.log('BC:', bc.summary.totalHPP);
    console.log('PF+BC:', pf.summary.totalHPP + bc.summary.totalHPP);
    console.log('ALL:', all.summary.totalHPP);
    
    console.log('=== LABA KOTOR ===');
    console.log('PF:', pf.summary.grossProfit);
    console.log('BC:', bc.summary.grossProfit);
    console.log('PF+BC:', pf.summary.grossProfit + bc.summary.grossProfit);
    console.log('ALL:', all.summary.grossProfit);
    
    console.log('=== OPERASIONAL (OPS) ===');
    console.log('PF:', pf.summary.totalExpenses);
    console.log('BC:', bc.summary.totalExpenses);
    console.log('PF+BC:', pf.summary.totalExpenses + bc.summary.totalExpenses);
    console.log('ALL:', all.summary.totalExpenses);

    console.log('=== LABA BERSIH ===');
    console.log('PF:', pf.summary.netProfit);
    console.log('BC:', bc.summary.netProfit);
    console.log('PF+BC:', pf.summary.netProfit + bc.summary.netProfit);
    console.log('ALL:', all.summary.netProfit);
}
main().catch(console.error).finally(() => prisma.$disconnect());
