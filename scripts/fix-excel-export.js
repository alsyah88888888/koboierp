const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Add Harga Beli /Pcs right after Qty Beli
  content = content.replace(
    /'Qty Beli': row\['QTY BELI'\] \|\| 0,\n\s*'Total Beli \(HPP\)': row\['TOTAL BELI'\] \|\| 0,/g,
    `'Qty Beli': row['QTY BELI'] || 0,\n                    'Harga Beli /Pcs': row['HARGA BELI'] || 0,\n                    'Total Beli (HPP)': row['TOTAL BELI'] || 0,`
  );

  // Add No. PO before No. Penjualan, and add Harga Jual /Pcs right before Total Jual
  content = content.replace(
    /'Sales Jual': row\.SALES \|\| '-',\n\s*'No\. Penjualan': row\['NOMOR INVOICE PENJUALAN'\] \|\| '-',\n\s*'No\. Faktur Penjualan': row\['NOMOR FAKTUR PENJUALAN'\] \|\| '-',\n\s*'No\. Surat Jalan': row\['NOMOR SJ'\] \|\| '-',\n\s*'Tgl Jual': row\['TANGGAL JUAL'\],\n\s*'Qty Jual': row\['QTY JUAL'\] \|\| 0,\n\s*'Total Jual \(Net\)': row\['TOTAL JUAL'\] \|\| 0,/g,
    `'Sales Jual': row.SALES || '-',\n                    'No. PO': row['NOMOR PO'] || '-',\n                    'No. Penjualan': row['NOMOR INVOICE PENJUALAN'] || '-',\n                    'No. Faktur Penjualan': row['NOMOR FAKTUR PENJUALAN'] || '-',\n                    'No. Surat Jalan': row['NOMOR SJ'] || '-',\n                    'Tgl Jual': row['TANGGAL JUAL'],\n                    'Qty Jual': row['QTY JUAL'] || 0,\n                    'Harga Jual /Pcs': row['HARGA JUAL'] || 0,\n                    'Total Jual (Net)': row['TOTAL JUAL'] || 0,`
  );
  
  // Weekly might use `r` instead of `row` or have slightly different spacing. Let's check.
  // We'll see if there are any remaining matches.
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${filePath}`);
}

fixFile('src/app/reports/ReportsDashboard.tsx');
