const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/lib/services/report-service.ts');
let content = fs.readFileSync(filePath, 'utf8');

const target = `const grossProfit = totalRevenue - netPurchases; // User requested: Penjualan - Pembelian`;
const replacement = `const grossProfit = totalRevenue - totalHpp; // Correct standard accounting: Penjualan - HPP`;

content = content.replace(target, replacement);
fs.writeFileSync(filePath, content, 'utf8');
console.log("Patched gross margin calculation in report-service.ts!");
