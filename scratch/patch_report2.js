const fs = require('fs');
let code = fs.readFileSync('src/lib/services/report-service.ts', 'utf8');

// For Closing Report (approx line 879)
code = code.replace(
    /const \{ total: totalExpenses \} = calculateAccrualOpsExpenses\(expenses, monthlyTraceability\);/,
    `const { linked: linkedOpsExpense, unlinked: generalOps, total: totalExpenses } = calculateAccrualOpsExpenses(expenses, monthlyTraceability);
        const { linked: cashLinked, unlinked: cashUnlinked } = calculateCashFlowOpsExpenses(expenses, monthlyTraceability);
        
        const expenseByCategory = [
            { name: "Ops Kirim (P&L)", value: linkedOpsExpense },
            { name: "Ops Umum (P&L)", value: generalOps }
        ].filter(x => x.value > 0);

        const cashFlowByCategory = [
            { name: "Ops Kirim (Uang Keluar)", value: cashLinked },
            { name: "Ops Lainnya (Hutang/Muka/Umum)", value: cashUnlinked }
        ].filter(x => x.value > 0);`
);

// For Daily Report (approx line 1423)
code = code.replace(
    /const \{ linked: linkedOpsExpense, unlinked: generalExpense, total: totalExpense \} = calculateAccrualOpsExpenses\(operational, dailyTraceability\);/,
    `const { linked: linkedOpsExpense, unlinked: generalExpense, total: totalExpense } = calculateAccrualOpsExpenses(operational, dailyTraceability);
        const { linked: cashLinked, unlinked: cashUnlinked } = calculateCashFlowOpsExpenses(operational, dailyTraceability);
        
        const expenseByCategory = [
            { name: "Ops Kirim (P&L)", value: linkedOpsExpense },
            { name: "Ops Umum (P&L)", value: generalExpense }
        ].filter(x => x.value > 0);

        const cashFlowByCategory = [
            { name: "Ops Kirim (Uang Keluar)", value: cashLinked },
            { name: "Ops Lainnya (Hutang/Muka/Umum)", value: cashUnlinked }
        ].filter(x => x.value > 0);`
);

// For Weekly Report (approx line 1841)
code = code.replace(
    /const \{ linked: linkedOpsExpense, unlinked: generalOps, total: totalExpenses \} = calculateAccrualOpsExpenses\(operational, weeklyTraceability\);/,
    `const { linked: linkedOpsExpense, unlinked: generalOps, total: totalExpenses } = calculateAccrualOpsExpenses(operational, weeklyTraceability);
        const { linked: cashLinked, unlinked: cashUnlinked } = calculateCashFlowOpsExpenses(operational, weeklyTraceability);
        
        const expenseByCategory = [
            { name: "Ops Kirim (P&L)", value: linkedOpsExpense },
            { name: "Ops Umum (P&L)", value: generalOps }
        ].filter(x => x.value > 0);

        const cashFlowByCategory = [
            { name: "Ops Kirim (Uang Keluar)", value: cashLinked },
            { name: "Ops Lainnya (Hutang/Muka/Umum)", value: cashUnlinked }
        ].filter(x => x.value > 0);`
);

// Inject expenseByCategory and cashFlowByCategory into the return payloads if they don't exist
// We will just do a blind replace for the standard return object properties
// Daily:
code = code.replace(/expenseByCategory:\s*\[\s*\{\s*name:\s*"Ops Kirim dan Muat"[^\]]*\]\.filter[^\)]*\)/g, 'expenseByCategory, cashFlowByCategory');
// Weekly & Closing
code = code.replace(/expenseByCategory:\s*\[\s*\{\s*name:\s*"Ops Kirim dan Muat"[^\]]*\]\.filter[^\)]*\)/g, 'expenseByCategory, cashFlowByCategory');
code = code.replace(/expenseByCategory:\s*\[\s*\{\s*name:\s*"Ops Kirim"[^\]]*\]\.filter[^\)]*\)/g, 'expenseByCategory, cashFlowByCategory');

fs.writeFileSync('src/lib/services/report-service.ts', code);
