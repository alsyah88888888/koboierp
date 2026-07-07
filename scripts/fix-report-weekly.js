const fs = require('fs');
function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  const rowPatternWeekly = /<span className="tabular-nums font-bold">\{row\['QTY BELI'\]\}<\/span>,\n\s*<span className="tabular-nums font-bold text-rose-600">\{isClient \? formatCurrency\(row\['TOTAL BELI'\]\) : '\.\.\.'\}<\/span>,\n\s*<span className="tabular-nums font-bold text-amber-600">\{isClient \? formatCurrency\(row\.OPS\) : '\.\.\.'\}<\/span>,\n\s*<span className="font-semibold truncate max-w-\[130px\] block" title=\{row\['NAMA PEMBELI'\]\}>\{row\['NAMA PEMBELI'\]\}<\/span>,\n\s*row\.SALES,\n\s*<span className="font-semibold text-xs text-blue-700">\{row\['NOMOR INVOICE PENJUALAN'\]\}<\/span>,\n\s*<span className="font-semibold text-xs">\{row\['NOMOR FAKTUR PENJUALAN'\]\}<\/span>,\n\s*<span className="font-semibold text-xs text-slate-500">\{row\['NOMOR SJ'\]\}<\/span>,\n\s*row\['TANGGAL JUAL'\],\n\s*row\['QTY JUAL'\],\n\s*<span className="tabular-nums font-black text-blue-600">\{isClient \? formatCurrency\(row\['TOTAL JUAL'\]\) : '\.\.\.'\}<\/span>,/g;
  
  const replaceRowWeekly = `<span className="tabular-nums font-bold">{row['QTY BELI']}</span>,
                        <span className="tabular-nums text-slate-500">{isClient ? formatCurrency(row['HARGA BELI'] || 0) : '...'}</span>,
                        <span className="tabular-nums font-bold text-rose-600">{isClient ? formatCurrency(row['TOTAL BELI']) : '...'}</span>,
                        <span className="tabular-nums font-bold text-amber-600">{isClient ? formatCurrency(row.OPS || 0) : '...'}</span>,
                        <span className="font-semibold truncate max-w-[130px] block" title={row['NAMA PEMBELI']}>{row['NAMA PEMBELI']}</span>,
                        row.SALES,
                        <span className="font-semibold text-xs text-blue-700">{row['NOMOR INVOICE PENJUALAN']}</span>,
                        <span className="font-semibold text-xs">{row['NOMOR FAKTUR PENJUALAN']}</span>,
                        <span className="font-semibold text-xs text-slate-500">{row['NOMOR SJ']}</span>,
                        row['TANGGAL JUAL'],
                        row['QTY JUAL'],
                        <span className="tabular-nums text-slate-500">{isClient ? formatCurrency(row['HARGA JUAL'] || 0) : '...'}</span>,
                        <span className="tabular-nums font-black text-blue-600">{isClient ? formatCurrency(row['TOTAL JUAL']) : '...'}</span>,`;
                        
  let newContent = content.replace(rowPatternWeekly, replaceRowWeekly);
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent);
    console.log(`Updated ${filePath}`);
  } else {
    console.log(`Could not find weekly row pattern`);
  }
}
fixFile('src/app/reports/ReportsDashboard.tsx');
