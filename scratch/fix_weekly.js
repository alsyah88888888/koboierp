const fs = require('fs');
let content = fs.readFileSync('src/lib/services/report-service.ts', 'utf8');

// 1. Weekly Report calculation
const weeklyTarget = `            const opsExpense = dayOps.filter((o: any) => o.transactionType === 'PAYMENT' || o.transactionType === 'EXPENSE' || Number(o.amount) < 0)
                .reduce((s: number, o: any) => s + Math.abs(Number(o.amount || 0)), 0);

            let dayHPP = 0;
            daySales.forEach((s: any) => {
                const isPKP = s.isPKP || Number(s.taxRate || 0) > 0 || String(s.invoiceNumber || '').includes('TRN');
                const taxMultiplier = 1 + (isPKP ? 0.11 : 0);
                (s.items || []).forEach((item: any) => {
                    const qty = Number(item.quantity || 0);
                    if (item.lotAllocations && item.lotAllocations.length > 0) {
                        item.lotAllocations.forEach((alloc: any) => {
                            dayHPP += Number(alloc.qty || 0) * Math.round(Number(alloc.hppAtTime || 0) * taxMultiplier);
                        });
                    } else {
                        dayHPP += qty * Math.round(Number(item.product?.purchasePrice || 0) * taxMultiplier);
                    }
                });
            });`;

const weeklyReplacement = `            const daySalesDeliveries = daySales.map((s: any) => s.deliveryNumber).filter(Boolean);
            const dayTraceRows = weeklyTraceability.filter((t: any) => daySalesDeliveries.includes(t['NOMOR SJ']));

            let dayHPP = dayTraceRows.reduce((sum: number, t: any) => sum + Number(t['TOTAL BELI (HPP)'] || 0), 0);
            const linkedOpsExpense = dayTraceRows.reduce((sum: number, t: any) => sum + Number(t['OPS'] || 0), 0);

            // General Ops that occurred today (unlinked)
            const generalOps = dayOps.filter((o: any) => 
                (o.transactionType === 'PAYMENT' || o.transactionType === 'EXPENSE' || Number(o.amount) < 0) && !o.invoiceNumber
            ).reduce((s: number, o: any) => s + Math.abs(Number(o.amount || 0)), 0);

            const opsExpense = generalOps + linkedOpsExpense;`;

if (content.includes(weeklyTarget)) {
    content = content.replace(weeklyTarget, weeklyReplacement);
    console.log("Weekly breakdown replaced successfully.");
} else {
    console.log("Failed to find Weekly breakdown target.");
}

// 2. Weekly Report Summary
const weeklySumTarget = `        const totalSales = sales.reduce((sum: number, s: any) => sum + Number(s.grandTotal || 0), 0);
        const totalPurchases = purchases.reduce((sum: number, p: any) => sum + Number(p.grandTotal || 0), 0);
        const totalExpenses = operational.filter((o: any) => o.transactionType === 'PAYMENT' || o.transactionType === 'EXPENSE' || Number(o.amount) < 0)
            .reduce((sum: number, o: any) => sum + Math.abs(Number(o.amount || 0)), 0);

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

const weeklySumReplacement = `        const totalSales = sales.reduce((sum: number, s: any) => sum + Number(s.grandTotal || 0), 0);
        const totalPurchases = purchases.reduce((sum: number, p: any) => sum + Number(p.grandTotal || 0), 0);
        
        const totalHPP = dailyBreakdown.reduce((sum: number, d: any) => sum + Number(d.hpp || 0), 0);
        const totalExpenses = dailyBreakdown.reduce((sum: number, d: any) => sum + Number(d.opsExpense || 0), 0);`;

if (content.includes(weeklySumTarget)) {
    content = content.replace(weeklySumTarget, weeklySumReplacement);
    console.log("Weekly summary replaced successfully.");
} else {
    console.log("Failed to find Weekly summary target.");
}

fs.writeFileSync('src/lib/services/report-service.ts', content);
