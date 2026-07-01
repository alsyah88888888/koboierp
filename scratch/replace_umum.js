const fs = require('fs');

const files = [
    'src/app/warehouse/WarehouseDashboard.tsx',
    'src/app/warehouse/StockTransferModal.tsx',
    'src/app/warehouse/StockInputModal.tsx',
    'src/lib/services/sales-service.ts',
    'src/lib/services/warehouse-service.ts',
    'src/lib/services/purchase-service.ts',
    'src/lib/services/report-service.ts'
];

for (const file of files) {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        content = content.replace(/"UMUM"/g, '"CIBINONG"');
        content = content.replace(/'UMUM'/g, "'CIBINONG'");
        content = content.replace(/>UMUM</g, '>CIBINONG<');
        content = content.replace(/placeholder="UMUM"/g, 'placeholder="CIBINONG"');
        fs.writeFileSync(file, content);
        console.log(`Replaced in ${file}`);
    }
}
