const fs = require('fs');
function revertFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  const searchPattern = /const exactGrandTotal = exactDpp \+ exactTaxAmount;\n\s*const grandTotal = Math\.round\(exactGrandTotal \/ 10\) \* 10;\n\s*const diff = grandTotal - Math\.round\(exactGrandTotal\);\n\s*const subtotal = Math\.round\(subtotalExact\);\n\s*const taxAmount = Math\.round\(exactTaxAmount\) \+ diff;/g;
  
  const replacePattern = `const subtotal = Math.round(subtotalExact);
        const taxAmount = Math.round(exactTaxAmount);
        const grandTotal = Math.round(exactDpp + exactTaxAmount);`;
  
  let newContent = content.replace(searchPattern, replacePattern);
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent);
    console.log(`Reverted ${filePath}`);
  }
}

revertFile('src/lib/services/sales-service.ts');
revertFile('src/lib/services/purchase-service.ts');

function revertFrontend(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const searchPattern = /const exactGrandTotal = dpp \+ taxAmount;\n\s*const grandTotal = Math\.round\(exactGrandTotal \/ 10\) \* 10;/g;
  const replacePattern = `const grandTotal = Math.round(dpp + taxAmount);`;
  
  const searchPattern2 = /const exactGrandTotal = exactDpp \+ exactTaxAmount;\n\s*const grandTotal = Math\.round\(exactGrandTotal \/ 10\) \* 10;/g;
  const replacePattern2 = `const grandTotal = Math.round(exactDpp + exactTaxAmount);`;

  let newContent = content.replace(searchPattern, replacePattern);
  newContent = newContent.replace(searchPattern2, replacePattern2);
  
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent);
    console.log(`Reverted ${filePath}`);
  }
}

revertFrontend('src/app/sales/SalesModal.tsx');
revertFrontend('src/app/sales/SalesOrderModal.tsx');
revertFrontend('src/app/purchase/ReceiptModal.tsx');
