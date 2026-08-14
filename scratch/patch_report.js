const fs = require('fs');
let code = fs.readFileSync('src/lib/services/report-service.ts', 'utf8');

function patchReport(funcName) {
    // This is getting too complex to regex safely across 4 different functions.
}
