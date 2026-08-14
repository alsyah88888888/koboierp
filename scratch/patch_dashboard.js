const fs = require('fs');
let code = fs.readFileSync('src/app/reports/ReportsDashboard.tsx', 'utf8');

// The ReportsDashboard renders the summary in several places.
// We need to inject the "Arus Kas Operasional" UI next to "Biaya Operasional".
// This file is huge, let's locate the "Biaya Operasional" text first.
