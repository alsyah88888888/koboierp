const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix generateTraceabilityMonthly empty row
  const searchPattern1 = /'QTY JUAL'          : 0,\n\s*'TOTAL JUAL'        : 0,\n\s*'MARGIN'            : 0,\n\s*\}\);/g;
  const replacePattern1 = `'QTY JUAL'          : 0,\n                    'HARGA JUAL'        : 0,\n                    'TOTAL JUAL'        : 0,\n                    'MARGIN'            : 0,\n                    'HARGA BELI'        : hpp,\n                });`;
  
  // Fix generateTraceabilityMonthly populated row
  const searchPattern2 = /'QTY JUAL'          : Number\(alloc.qty\),\n\s*'TOTAL JUAL'        : Math.round\(totalJual\),\n\s*'MARGIN'            : Math.round\(margin\),/g;
  const replacePattern2 = `'QTY JUAL'          : Number(alloc.qty),
                        'HARGA JUAL'        : Number(alloc.qty) > 0 ? Math.round(totalJual / Number(alloc.qty)) : 0,
                        'TOTAL JUAL'        : Math.round(totalJual),
                        'MARGIN'            : Math.round(margin),
                        'HARGA BELI'        : Number(alloc.hppAtTime),`;
                        
  // Fix generateTraceabilityMonthly NO INVOICE mapping
  const searchPattern3 = /'NOMOR FAKTUR PENJUALAN': soNumber,\n\s*'NOMOR SJ'          : delivery\?\.deliveryNumber \|\| '-',/g;
  const replacePattern3 = `'NOMOR INVOICE PENJUALAN': delivery?.invoiceNumber || '-',
                        'NOMOR FAKTUR PENJUALAN': delivery?.taxInvoiceNumber || '-',
                        'NOMOR SJ'          : delivery?.deliveryNumber || '-',`;
                        
  let newContent = content.replace(searchPattern1, replacePattern1);
  newContent = newContent.replace(searchPattern2, replacePattern2);
  newContent = newContent.replace(searchPattern3, replacePattern3);
  
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent);
    console.log(`Updated ${filePath}`);
  }
}

fixFile('src/lib/services/report-service.ts');
