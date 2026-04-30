const fs = require('fs');

function removeIsContinuous(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/\s+isContinuous=\{true\}/g, '');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
}

removeIsContinuous('src/app/purchase/print/invoice/[id]/page.tsx');
removeIsContinuous('src/app/purchase/print/[id]/page.tsx'); // Just in case
