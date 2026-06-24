const fs = require('fs');

// 1. Fix report-service.ts
let service = fs.readFileSync('src/lib/services/report-service.ts', 'utf8');
service = service.replace(/t\['TOTAL BELI \(HPP\)'\]/g, "t['TOTAL BELI']");
fs.writeFileSync('src/lib/services/report-service.ts', service);

// 2. Fix ReportsDashboard.tsx
let dashboard = fs.readFileSync('src/app/reports/ReportsDashboard.tsx', 'utf8');
dashboard = dashboard.replace(/r\['TOTAL BELI \(HPP\)'\]/g, "r['TOTAL BELI']");
fs.writeFileSync('src/app/reports/ReportsDashboard.tsx', dashboard);

console.log("Keys fixed!");
