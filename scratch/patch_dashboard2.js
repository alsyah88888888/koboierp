const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/reports/ReportsDashboard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const oldSignature = "setActivePrefix: (val: 'PF' | 'BC' | 'ALL') => void }";
const newSignature = "setActivePrefix: (val: 'PF' | 'BC' | 'ALL') => void; setIsTraceModalOpen?: any; setSelectedTraceData?: any }";

content = content.replaceAll(oldSignature, newSignature);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Patched ReportsDashboard.tsx signatures successfully!");
