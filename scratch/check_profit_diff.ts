import { getComprehensiveMonthlyReportService } from '../src/lib/services/report-service';
import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    
    // We will query the DB exactly as report-service does
    const filterMonth = 6;
    const filterYear = 2026;
    const startDate = new Date(filterYear, filterMonth - 1, 1);
    const endDate = new Date(filterYear, filterMonth, 0, 23, 59, 59);

    const getBreakdown = async (prefix: 'PF' | 'BC' | 'ALL') => {
        const isAll = prefix === 'ALL';
        const allOperational = await prisma.financeTransaction.findMany({
            where: { 
                date: { gte: startDate, lte: endDate },
                ...(isAll ? {
                    OR: [
                        { description: { contains: 'PF', mode: 'insensitive' } },
                        { salesPerson: 'PF' },
                        { description: { contains: 'BC', mode: 'insensitive' } },
                        { salesPerson: 'BC' }
                    ]
                } : {
                    OR: [
                        { description: { contains: prefix, mode: 'insensitive' } },
                        { salesPerson: prefix }
                    ]
                })
            }
        });
        const expenses = allOperational.filter((o: any) =>
            o.transactionType === 'PAYMENT' || o.transactionType === 'EXPENSE' || Number(o.amount) < 0
        );
        const generalOps = expenses.filter((o: any) => !o.invoiceNumber).reduce((s: number, o: any) => s + Math.abs(Number(o.amount || 0)), 0);
        
        const monthlyReport: any = await getComprehensiveMonthlyReportService(6, 2026, prefix);
        const monthlyTraceability = monthlyReport.details.monthlyTraceability;
        const linkedOpsExpense = monthlyTraceability.reduce((sum: number, t: any) => sum + Number(t['OPS'] || 0), 0);
        
        return {
            totalRevenue: monthlyReport.profitLoss.revenue,
            totalHPP: monthlyReport.profitLoss.hpp,
            grossProfit: monthlyReport.profitLoss.grossProfit,
            totalExpenses: monthlyReport.profitLoss.expenses,
            netProfit: monthlyReport.profitLoss.netProfit,
            generalOps,
            linkedOpsExpense
        };
    };

    const pf = await getBreakdown('PF');
    const bc = await getBreakdown('BC');
    const all = await getBreakdown('ALL');

    console.log('=== PENJUALAN ===');
    console.log('PF:', pf.totalRevenue);
    console.log('BC:', bc.totalRevenue);
    console.log('PF+BC:', pf.totalRevenue + bc.totalRevenue);
    console.log('ALL:', all.totalRevenue);
    
    console.log('=== HPP ===');
    console.log('PF:', pf.totalHPP);
    console.log('BC:', bc.totalHPP);
    console.log('PF+BC:', pf.totalHPP + bc.totalHPP);
    console.log('ALL:', all.totalHPP);

    console.log('=== LABA KOTOR ===');
    console.log('PF:', pf.grossProfit);
    console.log('BC:', bc.grossProfit);
    console.log('PF+BC:', pf.grossProfit + bc.grossProfit);
    console.log('ALL:', all.grossProfit);
    
    console.log('=== OPERASIONAL (OPS) ===');
    console.log('PF Total:', pf.totalExpenses, '(General:', pf.generalOps, 'Linked:', pf.linkedOpsExpense, ')');
    console.log('BC Total:', bc.totalExpenses, '(General:', bc.generalOps, 'Linked:', bc.linkedOpsExpense, ')');
    console.log('PF+BC Total:', pf.totalExpenses + bc.totalExpenses);
    console.log('ALL Total:', all.totalExpenses, '(General:', all.generalOps, 'Linked:', all.linkedOpsExpense, ')');

    console.log('=== LABA BERSIH ===');
    console.log('PF:', pf.netProfit);
    console.log('BC:', bc.netProfit);
    console.log('PF+BC:', pf.netProfit + bc.netProfit);
    console.log('ALL:', all.netProfit);
}
main().catch(console.error);
