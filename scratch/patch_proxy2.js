const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/proxy.ts');
let content = fs.readFileSync(filePath, 'utf8');

const target = `        case "getMonthlyClosingReport":
            const { getMonthlyClosingReportAction } = await import("@/actions/finance");
            return await getMonthlyClosingReportAction(...args as [number, number]);`;

const replacement = `        case "getMonthlyClosingReport":
            const { getMonthlyClosingReportAction } = await import("@/actions/finance");
            return await getMonthlyClosingReportAction(...args as [number, number, 'PF' | 'BC' | 'ALL']);`;

content = content.replace(target, replacement);
fs.writeFileSync(filePath, content, 'utf8');
console.log("Patched proxy.ts for getMonthlyClosingReport!");
