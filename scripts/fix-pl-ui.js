const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Change TOTAL PEMBELIAN BARANG to TOTAL PEMBELIAN
  content = content.replace(/"TOTAL PEMBELIAN BARANG"/g, '"TOTAL PEMBELIAN"');

  // Change LABA KOTOR to HASIL
  content = content.replace(/"LABA KOTOR"/g, '"HASIL"');

  // Change LABA BERSIH to MARGIN
  content = content.replace(/"LABA BERSIH"/g, '"MARGIN"');

  // Add STOCK BARANG section
  // First, find where LABA BERSIH (now MARGIN) is rendered, and append STOCK BARANG
  const searchPattern = /<PLRow label="MARGIN" value=\{pl\.netProfit\} bold highlight=\{pl\.netProfit >= 0 \? 'green' : 'red'\} isClient=\{isClient\} \/>\n\s*<PLRow label=\{`  Margin Bersih`\} valueStr=\{`\$\{pl\.netMarginPct \|\| 0\}%`\} sub isClient=\{isClient\} \/>/;

  const replacement = `<PLRow label="MARGIN" value={pl.netProfit} bold highlight={pl.netProfit >= 0 ? 'green' : 'red'} isClient={isClient} />
                        <PLRow label={\`  Margin Bersih\`} valueStr={\`\${pl.netMarginPct || 0}%\`} sub isClient={isClient} />
                        <div className="border-t-2 border-slate-900 my-3" />
                        <PLRow label="STOCK BARANG (ALL DIV)" value={data.inventory?.ending || 0} bold isClient={isClient} />
                        <PLRow label="  Stock (PF)" valueStr="Terpusat (All Div)" sub isClient={isClient} />
                        <PLRow label="  Stock (BC)" valueStr="Terpusat (All Div)" sub isClient={isClient} />`;

  content = content.replace(searchPattern, replacement);
  fs.writeFileSync(filePath, content);
  console.log(`Updated UI ${filePath}`);
}

fixFile('src/app/reports/ReportsDashboard.tsx');
