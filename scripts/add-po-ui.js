const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Add 'No. PO' to the headers array
  content = content.replace(
    /'Sales Jual', 'No. Penjualan', 'No. Faktur Penjualan'/g,
    `'Sales Jual', 'No. PO', 'No. Penjualan', 'No. Faktur Penjualan'`
  );

  // Add {row['NOMOR PO']} to the daily and monthly UI
  content = content.replace(
    /row.SALES \|\| '-',\n\s*<span className="font-semibold text-blue-700">\{row\['NOMOR INVOICE PENJUALAN'\]\}<\/span>,/g,
    `row.SALES || '-',\n                        <span className="font-semibold text-xs text-slate-500">{row['NOMOR PO'] || '-'}</span>,\n                        <span className="font-semibold text-blue-700">{row['NOMOR INVOICE PENJUALAN']}</span>,`
  );

  content = content.replace(
    /row.SALES,\n\s*<span className="font-semibold text-xs text-blue-700">\{row\['NOMOR INVOICE PENJUALAN'\]\}<\/span>,/g,
    `row.SALES,\n                        <span className="font-semibold text-xs text-slate-500">{row['NOMOR PO'] || '-'}</span>,\n                        <span className="font-semibold text-xs text-blue-700">{row['NOMOR INVOICE PENJUALAN']}</span>,`
  );

  content = content.replace(
    /<span className="text-\[10px\] uppercase font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">\{row.SALES\}<\/span>,\n\s*<span className="font-semibold text-blue-700">\{row\['NOMOR INVOICE PENJUALAN'\]\}<\/span>,/g,
    `<span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{row.SALES}</span>,\n                        <span className="text-[10px] font-semibold text-slate-500">{row['NOMOR PO'] || '-'}</span>,\n                        <span className="font-semibold text-blue-700">{row['NOMOR INVOICE PENJUALAN']}</span>,`
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${filePath}`);
}

fixFile('src/app/reports/ReportsDashboard.tsx');
