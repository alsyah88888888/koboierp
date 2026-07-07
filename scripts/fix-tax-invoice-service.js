const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // In createSalesDeliveryService
  const createSearch = /poNumber: data\.poNumber,\n\s*invoiceNumber: invoiceNumber,/g;
  const createReplace = `poNumber: data.poNumber,\n                invoiceNumber: invoiceNumber,\n                taxInvoiceNumber: data.taxInvoiceNumber || null,\n                taxInvoiceDate: data.taxInvoiceDate ? new Date(data.taxInvoiceDate) : null,`;
  content = content.replace(createSearch, createReplace);

  // In updateSalesDeliveryService
  const updateSearch = /poNumber: data\.poNumber,\n\s*invoiceNumber: invoiceNumber,/g;
  const updateReplace = `poNumber: data.poNumber,\n                invoiceNumber: invoiceNumber,\n                taxInvoiceNumber: data.taxInvoiceNumber || null,\n                taxInvoiceDate: data.taxInvoiceDate ? new Date(data.taxInvoiceDate) : null,`;
  content = content.replace(updateSearch, updateReplace);

  fs.writeFileSync(filePath, content);
  console.log(`Updated backend for tax invoices in ${filePath}`);
}

fixFile('src/lib/services/sales-service.ts');
