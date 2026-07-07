const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  const insertPoint = /case "voidPaymentStatus":/g;
  const newAction = `case "transferFund":
            const { transferFundAction } = await import("@/actions/finance");
            return await transferFundAction(...args as [any, any, any, any, any]);\n        `;

  content = content.replace(insertPoint, newAction + "case \"voidPaymentStatus\":");
  fs.writeFileSync(filePath, content);
  console.log(`Added transferFund to proxy.ts`);
}

fixFile('src/proxy.ts');
