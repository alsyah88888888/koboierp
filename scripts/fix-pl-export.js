const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Find the P&L rows export logic
  const searchPattern = /const plRows = \[\n\s*\{ 'Keterangan': 'TOTAL PENJUALAN', 'Jumlah \(Rp\)': data\.profitLoss\.revenue \},\n\s*\{ 'Keterangan': '  Subtotal Penjualan', 'Jumlah \(Rp\)': data\.profitLoss\.revenueSubtotal \},\n\s*\{ 'Keterangan': '  Diskon', 'Jumlah \(Rp\)': -data\.profitLoss\.discount \},\n\s*\{ 'Keterangan': '  PPN', 'Jumlah \(Rp\)': data\.profitLoss\.salesTax \},\n\s*\{ 'Keterangan': '', 'Jumlah \(Rp\)': '' \},\n\s*\{ 'Keterangan': 'TOTAL PEMBELIAN BARANG', 'Jumlah \(Rp\)': data\.purchases\?.total \|\| 0 \},\n\s*\{ 'Keterangan': '', 'Jumlah \(Rp\)': '' \},\n\s*\{ 'Keterangan': 'LABA KOTOR', 'Jumlah \(Rp\)': data\.profitLoss\.grossProfit \},\n\s*\{ 'Keterangan': \`  Margin Kotor \(\$\{data\.profitLoss\.grossMarginPct\}%\)\`, 'Jumlah \(Rp\)': '' \},\n\s*\{ 'Keterangan': '', 'Jumlah \(Rp\)': '' \},\n\s*\{ 'Keterangan': 'BIAYA OPERASIONAL \(OPS\)', 'Jumlah \(Rp\)': data\.profitLoss\.expenses \},\n\s*\.\.\.\(data\.profitLoss\.expenseByCategory \|\| \[\]\)\.map\(\(c: any\) => \(\{\n\s*'Keterangan': \`  \$\{c\.name\}\`, 'Jumlah \(Rp\)': c\.value\n\s*\}\)\),\n\s*\{ 'Keterangan': '', 'Jumlah \(Rp\)': '' \},\n\s*\{ 'Keterangan': 'LABA BERSIH', 'Jumlah \(Rp\)': data\.profitLoss\.netProfit \},\n\s*\{ 'Keterangan': \`  Margin Bersih \(\$\{data\.profitLoss\.netMarginPct\}%\)\`, 'Jumlah \(Rp\)': '' \},\n\s*\];/g;

  const replacement = `const plRows = [
                { 'Keterangan': 'TOTAL PENJUALAN', 'Jumlah (Rp)': data.profitLoss.revenue },
                { 'Keterangan': 'TOTAL PEMBELIAN BARANG', 'Jumlah (Rp)': data.profitLoss.hpp || 0 },
                { 'Keterangan': '', 'Jumlah (Rp)': '' },
                { 'Keterangan': 'Gross Margin', 'Jumlah (Rp)': data.profitLoss.grossProfit },
                { 'Keterangan': '', 'Jumlah (Rp)': '' },
                { 'Keterangan': 'BIAYA OPERASIONAL (OPS)', 'Jumlah (Rp)': data.profitLoss.expenses },
                ...(data.profitLoss.expenseByCategory || []).map((c: any) => ({
                    'Keterangan': \`  \${c.name}\`, 'Jumlah (Rp)': c.value
                })),
                { 'Keterangan': '', 'Jumlah (Rp)': '' },
                { 'Keterangan': 'Margin', 'Jumlah (Rp)': data.profitLoss.netProfit },
                { 'Keterangan': '', 'Jumlah (Rp)': '' },
                { 'Keterangan': 'STOCK BARANG (ALL DIV)', 'Jumlah (Rp)': data.inventory?.ending || 0 }
            ];`;

  content = content.replace(searchPattern, replacement);
  fs.writeFileSync(filePath, content);
  console.log(`Updated Excel export in ${filePath}`);
}

fixFile('src/app/reports/ReportsDashboard.tsx');
