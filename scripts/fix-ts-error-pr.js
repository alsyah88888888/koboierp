const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix implicit any for `s` and `r` in invoiceNumber split logic
  content = content.replace(/\.map\(s => s\.trim\(\)\)/g, '.map((s: string) => s.trim())');
  content = content.replace(/\.filter\(r => r !== /g, '.filter((r: string) => r !== ');

  fs.writeFileSync(filePath, content);
  console.log(`Fixed TS error in ${filePath}`);
}

fixFile('src/app/purchase/PurchaseRequestModal.tsx');
