const fs = require('fs');
let content = fs.readFileSync('src/lib/services/report-service.ts', 'utf-8');

// 1. getMonthlyClosingReportService
content = content.replace(
    /const \[sales, purchases, expenses, arRecords, apRecords, bankJournals\] = await Promise\.all\(\[/,
    'const [sales, purchases, expenses, arRecords, apRecords, bankJournals, companyExpensesRecords] = await Promise.all(['
);
content = content.replace(
    /include: \{ account: true \},\s*orderBy: \{ date: 'asc' \}\s*\}\)\s*\]\);/,
    `include: { account: true },
                orderBy: { date: 'asc' }
            }),
            // 7. Global Operational Expenses
            (prisma as any).financeTransaction.findMany({
                where: {
                    date: { gte: startDate, lte: endDate },
                    AND: [ { OR: [ { transactionType: "PAYMENT" }, { transactionType: "EXPENSE" }, { amount: { lt: 0 } } ] } ]
                }
            })
        ]);`
);
content = content.replace(
    /const netProfit = grossProfit - totalExpenses;/,
    `const netProfit = grossProfit - totalExpenses;\n        const companyExpenses = companyExpensesRecords.reduce((acc: number, e: any) => acc + Math.abs(Number(e.amount || 0)), 0);`
);
content = content.replace(
    /expenses: Number\(totalExpenses \|\| 0\),/,
    `expenses: Number(totalExpenses || 0),\n            companyExpenses: Number(companyExpenses || 0),`
);

// 2. getComprehensiveDailyReportService
content = content.replace(
    /stockMovements, auditLogs\n\s*\] = await Promise\.all\(\[/,
    'stockMovements, auditLogs, companyExpensesRecords\n        ] = await Promise.all(['
);
content = content.replace(
    /orderBy: \{ createdAt: 'desc' \},\s*take: 50\s*\}\)\s*\]\);/,
    `orderBy: { createdAt: 'desc' },
                take: 50
            }),
            (prisma as any).financeTransaction.findMany({
                where: { date: { gte: dayStart, lte: dayEnd }, AND: [ { OR: [ { transactionType: "PAYMENT" }, { transactionType: "EXPENSE" }, { amount: { lt: 0 } } ] } ] }
            })
        ]);`
);
content = content.replace(
    /const totalExpenses = generalOps \+ linkedOpsExpense;/,
    `const totalExpenses = generalOps + linkedOpsExpense;\n        const companyExpenses = companyExpensesRecords.reduce((acc: number, e: any) => acc + Math.abs(Number(e.amount || 0)), 0);`
);
content = content.replace(
    /expenses: totalExpenses,/,
    `expenses: totalExpenses,\n            companyExpenses: companyExpenses,`
);

// 3. getComprehensiveWeeklyReportService
content = content.replace(
    /const \[sales, purchases, operational, stockMovements, weeklyTraceability\] = await Promise\.all\(\[/,
    'const [sales, purchases, operational, stockMovements, weeklyTraceability, companyExpensesRecords] = await Promise.all(['
);
content = content.replace(
    /calculateProductTraceabilityInternal\(startDate, endDate, prefix\)\.catch\(\(\) => \[\]\)\s*\]\);/,
    `calculateProductTraceabilityInternal(startDate, endDate, prefix).catch(() => []),
            (prisma as any).financeTransaction.findMany({
                where: { date: { gte: startDate, lte: endDate }, AND: [ { OR: [ { transactionType: "PAYMENT" }, { transactionType: "EXPENSE" }, { amount: { lt: 0 } } ] } ] }
            })
        ]);`
);
content = content.replace(
    /expenses: totalExpenses,(\s*)grossProfit,/,
    `expenses: totalExpenses,\n            companyExpenses: companyExpensesRecords.reduce((acc: number, e: any) => acc + Math.abs(Number(e.amount || 0)), 0),$1grossProfit,`
);

// 4. getComprehensiveMonthlyReportService
content = content.replace(
    /returnsPurchase, returnsSales, stockMovements, monthlyTraceability\n\s*\] = await Promise\.all\(\[/,
    'returnsPurchase, returnsSales, stockMovements, monthlyTraceability, companyExpensesRecords\n        ] = await Promise.all(['
);
content = content.replace(
    /calculateProductTraceabilityInternal\(startDate, endDate, prefix\)\.catch\(\(\) => \[\]\)\s*\]\);/g,
    `calculateProductTraceabilityInternal(startDate, endDate, prefix).catch(() => []),
            (prisma as any).financeTransaction.findMany({
                where: { date: { gte: startDate, lte: endDate }, AND: [ { OR: [ { transactionType: "PAYMENT" }, { transactionType: "EXPENSE" }, { amount: { lt: 0 } } ] } ] }
            })
        ]);`
);
content = content.replace(
    /const totalExpenses = generalOps \+ linkedOpsExpense;/,
    `const totalExpenses = generalOps + linkedOpsExpense;\n        const companyExpenses = companyExpensesRecords.reduce((acc: number, e: any) => acc + Math.abs(Number(e.amount || 0)), 0);`
);
content = content.replace(
    /expenses: totalExpenses,(\s*)netProfit:/,
    `expenses: totalExpenses,\n            companyExpenses: companyExpenses,$1netProfit:`
);

fs.writeFileSync('src/lib/services/report-service.ts', content);
console.log('Patched report-service.ts successfully.');
