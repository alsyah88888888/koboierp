const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove take: 200 for pending
  content = content.replace(/where: { isVoid: false, paymentStatus: { in: \["PENDING", "CREDIT", "PARTIAL"\] } },\n\s*orderBy: { createdAt: 'desc' },\n\s*take: 200,/g, `where: { isVoid: false, paymentStatus: { in: ["PENDING", "CREDIT", "PARTIAL"] } },
            orderBy: { createdAt: 'desc' },`);
            
  // Change take: 200 to take: 1000 for settled
  content = content.replace(/where: { isVoid: false, paymentStatus: "PAID" },\n\s*orderBy: { createdAt: 'desc' },\n\s*take: 200,/g, `where: { isVoid: false, paymentStatus: "PAID" },
            orderBy: { createdAt: 'desc' },
            take: 1000,`);
            
  content = content.replace(/where: { isVoid: false, paymentStatus: "PAID" },\n\s*orderBy: { updatedAt: 'desc' },\n\s*take: 200,/g, `where: { isVoid: false, paymentStatus: "PAID" },
            orderBy: { updatedAt: 'desc' },
            take: 1000,`);

  fs.writeFileSync(filePath, content);
  console.log(`Updated finance limits in ${filePath}`);
}

fixFile('src/app/finance/page.tsx');
