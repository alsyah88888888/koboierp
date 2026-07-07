const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Change take: 200 to take: 2000 for financeTransaction
  content = content.replace(/prisma\.financeTransaction\.findMany\(\{\n\s*where: userFilter,\n\s*orderBy: \{ date: 'desc' \},\n\s*take: 200/g, `prisma.financeTransaction.findMany({
            where: userFilter,
            orderBy: { date: 'desc' },
            take: 2000`);

  fs.writeFileSync(filePath, content);
  console.log(`Updated financeTransaction limits in ${filePath}`);
}

fixFile('src/app/finance/page.tsx');
