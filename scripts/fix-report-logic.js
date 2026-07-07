const fs = require('fs');

async function fixFile() {
  const filePath = 'src/lib/services/report-service.ts';
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix total expenses and margin logic
  const searchPattern = /const expenses = allOperational\.filter\(\(o: any\) =>\n\s*o\.transactionType === 'PAYMENT' \|\| o\.transactionType === 'EXPENSE' \|\| Number\(o\.amount\) < 0\n\s*\);\n\s*const generalOps = expenses\.filter\(\(o: any\) => !o\.invoiceNumber\)\.reduce\(\(s: number, o: any\) => s \+ Math\.abs\(Number\(o\.amount \|\| 0\)\), 0\);\n\s*const linkedOpsExpense = monthlyTraceability\.reduce\(\(sum: number, t: any\) => sum \+ Number\(t\['OPS'\] \|\| 0\), 0\);\n\s*const totalExpenses = generalOps \+ linkedOpsExpense;\n\s*const companyExpenses = companyExpensesRecords\.reduce\(\(acc: number, e: any\) => acc \+ Math\.abs\(Number\(e\.amount \|\| 0\)\), 0\);\n\n\s*\/\/ Net Profit\n\s*const netProfit = grossProfit - totalExpenses;/g;

  const replacement = `const expenses = allOperational.filter((o: any) =>
            o.transactionType === 'PAYMENT' || o.transactionType === 'EXPENSE' || Number(o.amount) < 0
        );
        const cashFlowExpenses = expenses.reduce((s: number, o: any) => s + Math.abs(Number(o.amount || 0)), 0);
        const linkedOpsExpense = monthlyTraceability.reduce((sum: number, t: any) => sum + Number(t['OPS'] || 0), 0);
        
        // User requested: Total Expenses = Total Cash Flow (47.6M)
        const totalExpenses = cashFlowExpenses;
        // Ops Umum (Global) = Total Cash Flow - Ops Terikat
        const generalOps = totalExpenses - linkedOpsExpense;

        const companyExpenses = companyExpensesRecords.reduce((acc: number, e: any) => acc + Math.abs(Number(e.amount || 0)), 0);

        // Net Profit (MARGIN)
        const netProfit = grossProfit - totalExpenses;`;

  content = content.replace(searchPattern, replacement);
  
  // Now let's fix the inventory ending logic
  const inventoryPattern = /inventory: \{ ending: await \(prisma as any\)\.stock\.findMany\(\{ include: \{ product: \{ select: \{ purchasePrice: true \} \} \} \}\)\.then\(\(s: any\[\]\) => s\.reduce\(\(acc: number, st: any\) => acc \+ \(Number\(st\.quantity \|\| 0\) \* Number\(st\.product\?\.purchasePrice \|\| 0\)\), 0\)\)\.catch\(\(\) => 0\) \},/g;
  
  const inventoryReplacement = `inventory: { ending: await (async () => {
                const stocks = await (prisma as any).stock.findMany({ include: { product: true } });
                const recentReceipts = await (prisma as any).goodsReceipt.findMany({ where: { isVoid: false }, include: { items: true }, orderBy: { createdAt: 'desc' } });
                let totalVal = 0;
                stocks.forEach((s: any) => {
                    const matchingReceipt = recentReceipts.find((r: any) => (r.receivedFrom || "CIBINONG").trim().toLowerCase() === (s.vendorName || "CIBINONG").trim().toLowerCase() && r.items?.some((item: any) => item.productId === s.productId));
                    const matchingItem = matchingReceipt?.items?.find((item: any) => item.productId === s.productId);
                    let hpp = matchingItem?.purchasePrice ? Number(matchingItem.purchasePrice) : 0;
                    if (!hpp || hpp === 0) hpp = Number(s.product?.purchasePrice || 0);
                    totalVal += (Number(s.quantity || 0) * hpp);
                });
                return totalVal;
            })().catch(() => 0) },`;

  content = content.replace(inventoryPattern, inventoryReplacement);
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated report logic in ${filePath}`);
}

fixFile();
