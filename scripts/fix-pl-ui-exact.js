const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  const searchPattern = /<div className="max-w-2xl mx-auto space-y-1">\n\s*<PLRow label="TOTAL PENJUALAN" value=\{pl\.revenue\} bold isClient=\{isClient\} \/>\n\s*<PLRow label="  Subtotal Penjualan" value=\{pl\.revenueSubtotal\} sub isClient=\{isClient\} \/>\n\s*<PLRow label="  Diskon Penjualan" value=\{-pl\.discount\} sub isClient=\{isClient\} \/>\n\s*<PLRow label="  PPN Keluaran" value=\{pl\.salesTax\} sub isClient=\{isClient\} \/>\n\s*<div className="h-3" \/>\n\s*<PLRow label="TOTAL PEMBELIAN" value=\{pl\.hpp \|\| 0\} bold negative isClient=\{isClient\} \/>\n\s*<div className="border-t-2 border-slate-900 my-3" \/>\n\s*<PLRow label="HASIL" value=\{pl\.grossProfit\} bold highlight=\{pl\.grossProfit >= 0 \? 'green' : 'red'\} isClient=\{isClient\} \/>\n\s*<PLRow label=\{`  Margin Kotor`\} valueStr=\{`\$\{pl\.grossMarginPct \|\| 0\}%`\} sub isClient=\{isClient\} \/>\n\s*<div className="h-3" \/>\n\s*<PLRow label="BIAYA OPERASIONAL \(OPS\)" value=\{pl\.expenses\} bold negative isClient=\{isClient\} \/>\n\s*\{\(pl\.expenseByCategory \|\| \[\]\)\.map\(\(cat: any, i: number\) => \(\n\s*<PLRow key=\{i\} label=\{`  \$\{cat\.name\}`\} value=\{cat\.value\} sub isClient=\{isClient\} \/>\n\s*\)\)\}\n\s*<div className="border-t-2 border-slate-900 my-3" \/>\n\s*<PLRow label="MARGIN" value=\{pl\.netProfit\} bold highlight=\{pl\.netProfit >= 0 \? 'green' : 'red'\} isClient=\{isClient\} \/>\n\s*<PLRow label=\{`  Margin Bersih`\} valueStr=\{`\$\{pl\.netMarginPct \|\| 0\}%`\} sub isClient=\{isClient\} \/>\n\s*<div className="border-t-2 border-slate-900 my-3" \/>\n\s*<PLRow label="STOCK BARANG \(ALL DIV\)" value=\{data\.inventory\?\.ending \|\| 0\} bold isClient=\{isClient\} \/>\n\s*<PLRow label="  Stock \(PF\)" valueStr="Terpusat \(All Div\)" sub isClient=\{isClient\} \/>\n\s*<PLRow label="  Stock \(BC\)" valueStr="Terpusat \(All Div\)" sub isClient=\{isClient\} \/>\n\s*<\/div>/g;

  const replacement = `<div className="max-w-2xl mx-auto space-y-1">
                        <PLRow label="TOTAL PENJUALAN" value={pl.revenue} bold isClient={isClient} />
                        <PLRow label="TOTAL PEMBELIAN BARANG" value={pl.hpp || 0} bold negative isClient={isClient} />
                        <div className="h-3" />
                        <PLRow label="Gross Margin" value={pl.grossProfit} bold highlight={pl.grossProfit >= 0 ? 'green' : 'red'} isClient={isClient} />
                        <div className="h-3" />
                        <PLRow label="BIAYA OPERASIONAL (OPS)" value={pl.expenses} bold negative isClient={isClient} />
                        {(pl.expenseByCategory || []).map((cat: any, i: number) => (
                            <PLRow key={i} label={\`  \${cat.name}\`} value={cat.value} sub isClient={isClient} />
                        ))}
                        <div className="h-3" />
                        <PLRow label="Margin" value={pl.netProfit} bold highlight={pl.netProfit >= 0 ? 'green' : 'red'} isClient={isClient} />
                        <div className="border-t-2 border-slate-900 my-3" />
                        <PLRow label="STOCK BARANG (ALL DIV)" value={data.inventory?.ending || 0} bold isClient={isClient} />
                    </div>`;

  content = content.replace(searchPattern, replacement);
  fs.writeFileSync(filePath, content);
  console.log(`Updated exact UI layout in ${filePath}`);
}

fixFile('src/app/reports/ReportsDashboard.tsx');
