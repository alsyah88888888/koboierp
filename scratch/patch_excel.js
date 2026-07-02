const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/reports/ReportsDashboard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. downloadSalesExcel
content = content.replace(
    `'No. Invoice': s.number,`,
    `'No. Invoice': s.invoiceNumber || s.number,\n            'No. Surat Jalan': s.number,`
);

// 2. handleExportExcel Daily Sales
content = content.replace(
    `'No': i + 1, 'No. SJ': s.number, 'Tanggal': fmtDate(s.date),`,
    `'No': i + 1, 'No. Invoice': s.invoiceNumber || s.number, 'No. Surat Jalan': s.number, 'Tanggal': fmtDate(s.date),`
);

// 3. handleExportExcel Daily Traceability
content = content.replace(
    `'No. Faktur Penjualan': r['NOMOR FAKTUR PENJUALAN'],\n                    'Tgl Jual': r['TANGGAL JUAL'],`,
    `'No. Faktur Penjualan': r['NOMOR FAKTUR PENJUALAN'],\n                    'No. Surat Jalan': r['NOMOR SJ'],\n                    'Tgl Jual': r['TANGGAL JUAL'],`
);

// 4. handleExportExcel Weekly Traceability
content = content.replace(
    `'No. Surat Jalan': r['NOMOR SURAT JALAN'],`,
    `'No. Surat Jalan': r['NOMOR SJ'],`
);

// 5. handleExportExcel Monthly Traceability (This will be replaced by the same replace as Weekly Traceability, we can use global replace or while loop)
while (content.includes(`'No. Surat Jalan': r['NOMOR SURAT JALAN'],`)) {
    content = content.replace(`'No. Surat Jalan': r['NOMOR SURAT JALAN'],`, `'No. Surat Jalan': r['NOMOR SJ'],`);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("Patched ReportsDashboard.tsx successfully!");
