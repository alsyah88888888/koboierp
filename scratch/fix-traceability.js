const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Find where opsTransactions is fetched
  const findRegex = /const opsTransactions = invoiceNumbers\.length > 0\n\s*\? await prisma\.financeTransaction\.findMany\(\{\n\s*where: \{\n\s*OR: invoiceNumbers\.map\(\(inv: string\) => \(\{ invoiceNumber: \{ contains: inv \} \}\)\)\n\s*\},/g;
  
  const replaceStr = `const opsTransactions = invoiceNumbers.length > 0
            ? await prisma.financeTransaction.findMany({
                where: {
                    OR: invoiceNumbers.map((inv: string) => ({ invoiceNumber: { contains: inv } })),
                    category: { notIn: ["PEMBELIAN", "PENJUALAN", "TRANSFER"] }
                },`;

  content = content.replace(findRegex, replaceStr);

  fs.writeFileSync(filePath, content);
  console.log(`Updated opsTransactions fetch in ${filePath}`);
}

fixFile('src/lib/services/report-service.ts');
