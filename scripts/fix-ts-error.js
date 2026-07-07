const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  content = content.replace(/\.then\(s => s\.reduce\(\(acc, st\) => /g, '.then((s: any[]) => s.reduce((acc: number, st: any) => ');

  fs.writeFileSync(filePath, content);
  console.log(`Fixed TS error in ${filePath}`);
}

fixFile('src/lib/services/report-service.ts');
