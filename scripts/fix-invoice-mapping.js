const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Daily mapping (lines 503-504)
  // 'NOMOR INVOICE PENJUALAN': sd.invoiceNumber || '-',
  // 'NOMOR FAKTUR PENJUALAN': sd.taxInvoiceNumber || '-',
  content = content.replace(/'NOMOR INVOICE PENJUALAN': sd\.invoiceNumber \|\| '-',\n\s*'NOMOR FAKTUR PENJUALAN': sd\.taxInvoiceNumber \|\| '-',/, `'NOMOR INVOICE PENJUALAN': soNumber,\n                    'NOMOR FAKTUR PENJUALAN': sd.invoiceNumber || '-',`);

  // Monthly mapping (lines 1115-1116)
  // 'NOMOR INVOICE PENJUALAN': delivery?.invoiceNumber || '-',
  // 'NOMOR FAKTUR PENJUALAN': delivery?.taxInvoiceNumber || '-',
  content = content.replace(/'NOMOR INVOICE PENJUALAN': delivery\?\.invoiceNumber \|\| '-',\n\s*'NOMOR FAKTUR PENJUALAN': delivery\?\.taxInvoiceNumber \|\| '-',/, `'NOMOR INVOICE PENJUALAN': soNumber,\n                        'NOMOR FAKTUR PENJUALAN': delivery?.invoiceNumber || '-',`);
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${filePath}`);
}

fixFile('src/lib/services/report-service.ts');
