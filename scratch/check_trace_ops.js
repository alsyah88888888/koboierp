const fs = require('fs');
const content = fs.readFileSync('src/lib/services/report-service.ts', 'utf8');
const match = content.match(/ops.*=/gi);
console.log("Ops mentions in traceability:", match);
