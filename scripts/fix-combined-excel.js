const fs = require('fs');
function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix Qty Beli & Total Beli
  content = content.replace(
    /'Qty Beli': r\['QTY BELI'\],\n\s*'Total Beli \(HPP\)': r\['TOTAL BELI'\],/g,
    `'Qty Beli': r['QTY BELI'],\n                    'Harga Beli /Pcs': r['HARGA BELI'] || 0,\n                    'Total Beli (HPP)': r['TOTAL BELI'],`
  );

  // Fix No. Faktur & Sales
  content = content.replace(
    /'Sales': r\.SALES,\n\s*'No\. Faktur': r\['NOMOR FAKTUR PENJUALAN'\],\n\s*'No\. SJ': r\['NOMOR SJ'\],\n\s*'Tgl Jual': r\['TANGGAL JUAL'\],\n\s*'Qty Jual': r\['QTY JUAL'\],\n\s*'Total Jual': r\['TOTAL JUAL'\],/g,
    `'Sales Jual': r.SALES || '-',\n                    'No. PO': r['NOMOR PO'] || '-',\n                    'No. Penjualan': r['NOMOR INVOICE PENJUALAN'] || '-',\n                    'No. Faktur Penjualan': r['NOMOR FAKTUR PENJUALAN'] || '-',\n                    'No. Surat Jalan': r['NOMOR SJ'] || '-',\n                    'Tgl Jual': r['TANGGAL JUAL'],\n                    'Qty Jual': r['QTY JUAL'],\n                    'Harga Jual /Pcs': r['HARGA JUAL'] || 0,\n                    'Total Jual (Net)': r['TOTAL JUAL'],`
  );

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${filePath}`);
}
fixFile('src/app/reports/ReportsDashboard.tsx');
