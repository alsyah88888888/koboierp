const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // We need to add inventory data to the return object of generateReportMonthlySummary
  // Let's find "profitLoss: {" and add inventory before it
  const searchPattern = /profitLoss: \{/g;
  
  // We need to fetch the stock value just like generateFinanceReport does.
  // Wait, generateFinanceReport calculates beginningValue and endingValue.
  // But generateReportMonthlySummary doesn't have it.
  // We can just calculate current inventory value.
  
  const replacement = `inventory: { ending: await (prisma as any).stock.findMany({ include: { product: { select: { purchasePrice: true } } } }).then(s => s.reduce((acc, st) => acc + (Number(st.quantity || 0) * Number(st.product?.purchasePrice || 0)), 0)).catch(() => 0) },\n            profitLoss: {`;

  content = content.replace(searchPattern, replacement);
  fs.writeFileSync(filePath, content);
  console.log(`Updated inventory in ${filePath}`);
}

fixFile('src/lib/services/report-service.ts');
