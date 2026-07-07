const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Change where condition in page.tsx to exclude PEMBELIAN, PENJUALAN, TRANSFER
  content = content.replace(/where: session\?\.user\?\.email === 'chici@kolaborasi\.id' \? \{ salesPerson: 'BC' \} : \{\},/g, `where: {
            category: { notIn: ["PEMBELIAN", "PENJUALAN", "TRANSFER"] },
            ...(session?.user?.email === 'chici@kolaborasi.id' ? { salesPerson: 'BC' } : {})
        },`);

  fs.writeFileSync(filePath, content);
  console.log(`Updated query in ${filePath}`);
}

fixFile('src/app/operational/page.tsx');
