const fs = require('fs');
let content = fs.readFileSync('src/lib/services/report-service.ts', 'utf8');

const target = `        const expenseTransactions = operational.filter((o: any) =>
            o.transactionType === 'PAYMENT' || o.transactionType === 'EXPENSE' || Number(o.amount) < 0
        );
        const totalIncome = incomeTransactions.reduce((s: number, o: any) => s + Math.abs(Number(o.amount || 0)), 0);
        const totalExpense = expenseTransactions.reduce((s: number, o: any) => s + Math.abs(Number(o.amount || 0)), 0);

        // Payment status breakdown
        const salesPaid = sales.filter((s: any) => s.paymentStatus === 'PAID').length;
        const salesPending = sales.filter((s: any) => s.paymentStatus !== 'PAID').length;
        const purchasePaid = purchases.filter((p: any) => p.paymentStatus === 'PAID').length;
        const purchasePending = purchases.filter((p: any) => p.paymentStatus !== 'PAID').length;

        // Calculate HPP of items sold
        let totalHPP = 0;
        sales.forEach((s: any) => {
            const isPKP = s.isPKP || Number(s.taxRate || 0) > 0 || String(s.invoiceNumber || '').includes('TRN');
            const taxMultiplier = 1 + (isPKP ? 0.11 : 0);
            (s.items || []).forEach((item: any) => {
                const qty = Number(item.quantity || 0);
                if (item.lotAllocations && item.lotAllocations.length > 0) {
                    item.lotAllocations.forEach((alloc: any) => {
                        totalHPP += Number(alloc.qty || 0) * Math.round(Number(alloc.hppAtTime || 0) * taxMultiplier);
                    });
                } else {
                    totalHPP += qty * Math.round(Number(item.product?.purchasePrice || 0) * taxMultiplier);
                }
            });
        });`;

const replacement = `        const expenseTransactions = operational.filter((o: any) =>
            (o.transactionType === 'PAYMENT' || o.transactionType === 'EXPENSE' || Number(o.amount) < 0) && !o.invoiceNumber
        );
        const totalIncome = incomeTransactions.reduce((s: number, o: any) => s + Math.abs(Number(o.amount || 0)), 0);
        
        const generalExpense = expenseTransactions.reduce((s: number, o: any) => s + Math.abs(Number(o.amount || 0)), 0);
        const linkedOpsExpense = dailyTraceability.reduce((sum: number, t: any) => sum + Number(t['OPS'] || 0), 0);
        const totalExpense = generalExpense + linkedOpsExpense;

        // Payment status breakdown
        const salesPaid = sales.filter((s: any) => s.paymentStatus === 'PAID').length;
        const salesPending = sales.filter((s: any) => s.paymentStatus !== 'PAID').length;
        const purchasePaid = purchases.filter((p: any) => p.paymentStatus === 'PAID').length;
        const purchasePending = purchases.filter((p: any) => p.paymentStatus !== 'PAID').length;

        // Calculate HPP of items sold from traceability
        const totalHPP = dailyTraceability.reduce((sum: number, t: any) => sum + Number(t['TOTAL BELI (HPP)'] || 0), 0);`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('src/lib/services/report-service.ts', content);
    console.log("Success");
} else {
    console.log("Failed to match");
}
