const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Change "Ops Terikat (Traceability)" to "Ops Kirim dan Muat"
  content = content.replace(/"Ops Terikat \(Traceability\)"/g, '"Ops Kirim dan Muat"');

  // Change "Ops Umum (Global)" to "Ops"
  content = content.replace(/"Ops Umum \(Global\)"/g, '"Ops"');

  fs.writeFileSync(filePath, content);
  console.log(`Updated names in ${filePath}`);
}

fixFile('src/lib/services/report-service.ts');
