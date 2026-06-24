const fs = require('fs');
let content = fs.readFileSync('src/lib/services/report-service.ts', 'utf8');

const target = `        const totalPurchases = purchases.reduce((s: number, d: any) => s + Number(d.grandTotal || 0), 0);
        const totalExpenses = operational
            .filter((o: any) => o.transactionType === 'PAYMENT' || o.transactionType === 'EXPENSE' || Number(o.amount) < 0)
            .reduce((s: number, o: any) => s + Math.abs(Number(o.amount || 0)), 0);

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

const replacement = `        const totalPurchases = purchases.reduce((s: number, d: any) => s + Number(d.grandTotal || 0), 0);
        
        const totalHPP = dailyBreakdown.reduce((sum: number, d: any) => sum + Number(d.hpp || 0), 0);
        const totalExpenses = dailyBreakdown.reduce((sum: number, d: any) => sum + Number(d.opsExpense || 0), 0);`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('src/lib/services/report-service.ts', content);
    console.log("Success");
} else {
    console.log("Failed to match");
}
