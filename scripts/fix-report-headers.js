const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  const searchPattern = /headers=\{\['No\.', 'Barcode', 'Nama Item', 'Supplier', 'Sales Beli', 'No\. LPB', 'Tgl Beli', 'Qty Beli', 'Total Beli \(HPP\)', 'Ops', 'Buyer', 'Sales Jual', 'No\. Penjualan', 'No\. Faktur Penjualan', 'No\. Surat Jalan', 'Tgl Jual', 'Qty Jual', 'Total Jual \(Net\)', 'Margin', 'Margin %', 'Aksi'\]\}/g;
  
  const replacePattern = `headers={['No.', 'Barcode', 'Nama Item', 'Supplier', 'Sales Beli', 'No. LPB', 'Tgl Beli', 'Qty Beli', 'Harga Beli /Pcs', 'Total Beli (HPP)', 'Ops', 'Buyer', 'Sales Jual', 'No. Penjualan', 'No. Faktur Penjualan', 'No. Surat Jalan', 'Tgl Jual', 'Qty Jual', 'Harga Jual /Pcs', 'Total Jual (Net)', 'Margin', 'Margin %', 'Aksi']}`;
  
  let newContent = content.replace(searchPattern, replacePattern);
  
  // Now fix the row mappings for Daily
  const rowPatternDaily = /<span className="tabular-nums font-bold">\{row\['QTY BELI'\]\}<\/span>,\n\s*<span className="tabular-nums font-black text-emerald-600">\{isClient \? formatCurrency\(row\['TOTAL BELI'\]\) : '\.\.\.'\}<\/span>,\n\s*<span className="tabular-nums text-slate-500">\{isClient \? formatCurrency\(row\.OPS\) : '\.\.\.'\}<\/span>,\n\s*<span className="truncate max-w-\[120px\] block font-bold" title=\{row\['NAMA PEMBELI'\]\}>\{row\['NAMA PEMBELI'\]\}<\/span>,\n\s*<span className="text-\[10px\] uppercase font-bold text-slate-500 bg-slate-100 px-1\.5 py-0\.5 rounded">\{row\.SALES\}<\/span>,\n\s*<span className="text-\[10px\] text-slate-500">\{row\['NOMOR FAKTUR PENJUALAN'\]\}<\/span>,\n\s*<span className="text-\[10px\] text-slate-500">\{row\['NOMOR SJ'\]\}<\/span>,\n\s*row\['TANGGAL JUAL'\],\n\s*<span className="tabular-nums font-bold">\{row\['QTY JUAL'\]\}<\/span>,\n\s*<span className="tabular-nums font-black text-blue-600">\{isClient \? formatCurrency\(row\['TOTAL JUAL'\]\) : '\.\.\.'\}<\/span>,/g;
  
  const replaceRowDaily = `<span className="tabular-nums font-bold">{row['QTY BELI']}</span>,
                        <span className="tabular-nums text-slate-500">{isClient ? formatCurrency(row['HARGA BELI'] || 0) : '...'}</span>,
                        <span className="tabular-nums font-black text-emerald-600">{isClient ? formatCurrency(row['TOTAL BELI']) : '...'}</span>,
                        <span className="tabular-nums text-slate-500">{isClient ? formatCurrency(row.OPS) : '...'}</span>,
                        <span className="truncate max-w-[120px] block font-bold" title={row['NAMA PEMBELI']}>{row['NAMA PEMBELI']}</span>,
                        <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{row.SALES}</span>,
                        <span className="font-semibold text-blue-700">{row['NOMOR INVOICE PENJUALAN']}</span>,
                        <span className="text-[10px] text-slate-500">{row['NOMOR FAKTUR PENJUALAN']}</span>,
                        <span className="text-[10px] text-slate-500">{row['NOMOR SJ']}</span>,
                        row['TANGGAL JUAL'],
                        <span className="tabular-nums font-bold">{row['QTY JUAL']}</span>,
                        <span className="tabular-nums text-slate-500">{isClient ? formatCurrency(row['HARGA JUAL'] || 0) : '...'}</span>,
                        <span className="tabular-nums font-black text-blue-600">{isClient ? formatCurrency(row['TOTAL JUAL']) : '...'}</span>,`;

  newContent = newContent.replace(rowPatternDaily, replaceRowDaily);
  
  // Let's also do Monthly
  const rowPatternMonthly = /<span className="tabular-nums font-bold text-slate-700">\{row\['QTY BELI'\]\}<\/span>,\n\s*<span className="tabular-nums font-bold text-rose-600">\{isClient \? formatCurrency\(row\['TOTAL BELI'\]\) : '\.\.\.'\}<\/span>,\n\s*<span className="tabular-nums font-bold text-amber-600">\{isClient \? formatCurrency\(row\.OPS\) : '\.\.\.'\}<\/span>,\n\s*<span className="truncate max-w-\[130px\] block" title=\{row\['NAMA PEMBELI'\]\}>\{row\['NAMA PEMBELI'\]\}<\/span>,\n\s*row\.SALES \|\| '-',\n\s*<span className="font-semibold text-blue-700">\{row\['NOMOR INVOICE PENJUALAN'\]\}<\/span>,\n\s*<span className="font-black text-slate-900">\{row\['NOMOR FAKTUR PENJUALAN'\]\}<\/span>,\n\s*<span className="font-semibold text-slate-600">\{row\['NOMOR SJ'\]\}<\/span>,\n\s*row\['TANGGAL JUAL'\],\n\s*<span className="tabular-nums font-bold text-slate-700">\{row\['QTY JUAL'\]\}<\/span>,\n\s*<span className="tabular-nums font-bold text-blue-600">\{isClient \? formatCurrency\(row\['TOTAL JUAL'\]\) : '\.\.\.'\}<\/span>,/g;
  
  const replaceRowMonthly = `<span className="tabular-nums font-bold text-slate-700">{row['QTY BELI']}</span>,
                        <span className="tabular-nums text-slate-500">{isClient ? formatCurrency(row['HARGA BELI'] || 0) : '...'}</span>,
                        <span className="tabular-nums font-bold text-rose-600">{isClient ? formatCurrency(row['TOTAL BELI']) : '...'}</span>,
                        <span className="tabular-nums font-bold text-amber-600">{isClient ? formatCurrency(row.OPS) : '...'}</span>,
                        <span className="truncate max-w-[130px] block" title={row['NAMA PEMBELI']}>{row['NAMA PEMBELI']}</span>,
                        row.SALES || '-',
                        <span className="font-semibold text-blue-700">{row['NOMOR INVOICE PENJUALAN']}</span>,
                        <span className="font-black text-slate-900">{row['NOMOR FAKTUR PENJUALAN']}</span>,
                        <span className="font-semibold text-slate-600">{row['NOMOR SJ']}</span>,
                        row['TANGGAL JUAL'],
                        <span className="tabular-nums font-bold text-slate-700">{row['QTY JUAL']}</span>,
                        <span className="tabular-nums text-slate-500">{isClient ? formatCurrency(row['HARGA JUAL'] || 0) : '...'}</span>,
                        <span className="tabular-nums font-bold text-blue-600">{isClient ? formatCurrency(row['TOTAL JUAL']) : '...'}</span>,`;
                        
  newContent = newContent.replace(rowPatternMonthly, replaceRowMonthly);
  
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent);
    console.log(`Updated ${filePath}`);
  }
}

fixFile('src/app/reports/ReportsDashboard.tsx');
