const fs = require('fs');
const content = fs.readFileSync('src/lib/services/report-service.ts', 'utf8');
const lines = content.split('\n');
const start = lines.findIndex(l => l.includes('rowOps = Math.round(rowOps / lotQty) * qty;'));
console.log(lines.slice(start, start + 30).join('\n'));
