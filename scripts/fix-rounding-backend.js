const fs = require('fs');
function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  const searchPattern = /const subtotal = Math\.round\(subtotalExact\);\n\s*const taxAmount = Math\.round\(exactTaxAmount\);\n\s*const grandTotal = Math\.round\(exactDpp \+ exactTaxAmount\);/g;
  
  const replacePattern = `const exactGrandTotal = exactDpp + exactTaxAmount;
        const grandTotal = Math.round(exactGrandTotal / 10) * 10;
        const diff = grandTotal - Math.round(exactGrandTotal);
        const subtotal = Math.round(subtotalExact);
        const taxAmount = Math.round(exactTaxAmount) + diff;`;
  
  content = content.replace(searchPattern, replacePattern);
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${filePath}`);
}

fixFile('src/lib/services/sales-service.ts');
fixFile('src/lib/services/purchase-service.ts');
