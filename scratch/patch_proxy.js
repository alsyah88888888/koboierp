const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/proxy.ts');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('reallocateLotAction')) {
    const target = 'switch (actionName) {';
    const insertion = `switch (actionName) {
        case "reallocateLotAction":
            const { reallocateLotAction } = await import("@/actions/reports");
            return await reallocateLotAction(...args as [string, string]);`;
            
    content = content.replace(target, insertion);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Patched proxy.ts successfully!");
} else {
    console.log("Already patched.");
}
