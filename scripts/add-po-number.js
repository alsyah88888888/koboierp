const fs = require('fs');
function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Daily mapping
  content = content.replace(
    /'NOMOR INVOICE PENJUALAN': soNumber,/,
    `'NOMOR PO'         : sd.poNumber || '-',\n                    'NOMOR INVOICE PENJUALAN': soNumber,`
  );

  // Monthly empty mapping
  content = content.replace(
    /'NOMOR INVOICE PENJUALAN': '-',\n\s*'NOMOR FAKTUR PENJUALAN': '-',/,
    `'NOMOR PO'         : '-',\n                    'NOMOR INVOICE PENJUALAN': '-',\n                    'NOMOR FAKTUR PENJUALAN': '-',`
  );

  // Monthly actual mapping
  content = content.replace(
    /'NOMOR INVOICE PENJUALAN': soNumber,\n\s*'NOMOR FAKTUR PENJUALAN': delivery\?\.invoiceNumber \|\| '-',/,
    `'NOMOR PO'          : delivery?.poNumber || '-',\n                        'NOMOR INVOICE PENJUALAN': soNumber,\n                        'NOMOR FAKTUR PENJUALAN': delivery?.invoiceNumber || '-',`
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${filePath}`);
}

fixFile('src/lib/services/report-service.ts');
