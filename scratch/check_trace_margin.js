const fs = require('fs');
const content = fs.readFileSync('src/lib/services/report-service.ts', 'utf8');
const marginLines = content.split('\n').filter(l => l.includes('MARGIN') && l.includes('rowOps')).join('\n');
console.log(marginLines);
