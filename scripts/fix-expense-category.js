const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix generateReportMonthlySummary
  const searchPattern = /const categoryMap: Record<string, number> = \{\};\n\s*expenses\.forEach\(\(o: any\) => \{\n\s*const cat = o\.category \|\| o\.transactionType \|\| 'Lainnya';\n\s*categoryMap\[cat\] = \(categoryMap\[cat\] \|\| 0\) \+ Math\.abs\(Number\(o\.amount \|\| 0\)\);\n\s*\}\);\n\s*const expenseByCategory = Object\.entries\(categoryMap\)\n\s*\.map\(\(\[name, value\]\) => \(\{ name, value \}\)\)\n\s*\.sort\(\(a, b\) => b\.value - a\.value\);/g;

  const replacement = `const expenseByCategory = [
            { name: "Ops Terikat (Traceability)", value: linkedOpsExpense },
            { name: "Ops Umum (Global)", value: generalOps }
        ].filter(x => x.value > 0);`;

  content = content.replace(searchPattern, replacement);
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${filePath}`);
}

fixFile('src/lib/services/report-service.ts');
