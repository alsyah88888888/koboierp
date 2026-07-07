const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  const insertPoint = /case "updatePaymentStatus":/g;
  const newAction = `case "voidPaymentStatus":
            const { voidPaymentStatusAction } = await import("@/actions/finance");
            return await voidPaymentStatusAction(...args as [any, any]);\n        `;

  content = content.replace(insertPoint, newAction + "case \"updatePaymentStatus\":");
  fs.writeFileSync(filePath, content);
  console.log(`Added voidPaymentStatus to proxy.ts`);
}

fixFile('src/proxy.ts');
