const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace double taxInvoiceNumber
  content = content.replace(/taxInvoiceNumber: data\.taxInvoiceNumber \|\| null,\n\s*taxInvoiceDate: data\.taxInvoiceDate \? new Date\(data\.taxInvoiceDate\) : null,\n\s*taxInvoiceNumber: data\.taxInvoiceNumber \|\| null,\n\s*taxInvoiceDate: data\.taxInvoiceDate \? new Date\(data\.taxInvoiceDate\) : null,/g, `taxInvoiceNumber: data.taxInvoiceNumber || null,
                taxInvoiceDate: data.taxInvoiceDate ? new Date(data.taxInvoiceDate) : null,`);

  fs.writeFileSync(filePath, content);
  console.log(`Updated sales-service.ts to remove duplicates`);
}

fixFile('src/lib/services/sales-service.ts');
