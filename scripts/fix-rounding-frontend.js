const fs = require('fs');
function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  const searchPattern = /const grandTotal = Math\.round\(dpp \+ taxAmount\);/g;
  const replacePattern = `const exactGrandTotal = dpp + taxAmount;
    const grandTotal = Math.round(exactGrandTotal / 10) * 10;`;
    
  // For ReceiptModal.tsx
  const searchPattern2 = /const grandTotal = Math\.round\(exactDpp \+ exactTaxAmount\);/g;
  const replacePattern2 = `const exactGrandTotal = exactDpp + exactTaxAmount;
    const grandTotal = Math.round(exactGrandTotal / 10) * 10;`;
  
  let newContent = content.replace(searchPattern, replacePattern);
  newContent = newContent.replace(searchPattern2, replacePattern2);
  
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent);
    console.log(`Updated ${filePath}`);
  } else {
    console.log(`No changes made to ${filePath}`);
  }
}

fixFile('src/app/sales/SalesModal.tsx');
fixFile('src/app/sales/SalesOrderModal.tsx');
fixFile('src/app/purchase/ReceiptModal.tsx');
