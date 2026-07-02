const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/reports/ReportsDashboard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Imports
content = content.replace(
    /import {([^}]+)X,\s+Filter/s,
    "import {$1X,\n    Edit2,\n    Filter"
);

content = content.replace(
    /import { InvoiceModal } from '@\/app\/sales\/InvoiceModal';/,
    "import { InvoiceModal } from '@/app/sales/InvoiceModal';\nimport { TraceabilityReallocateModal } from './TraceabilityReallocateModal';"
);

// 2. States
content = content.replace(
    /const \[closingReport, setClosingReport\] = useState<any>\(null\);/,
    "const [selectedTraceData, setSelectedTraceData] = useState<any>(null);\n    const [isTraceModalOpen, setIsTraceModalOpen] = useState(false);\n\n    const [closingReport, setClosingReport] = useState<any>(null);"
);

// 3. Modal render
content = content.replace(
    /\{showInvoiceModal && selectedInvoiceId && \(\s*<InvoiceModal[\s\S]*?\/>\s*\)\}/,
    `{showInvoiceModal && selectedInvoiceId && (
                <InvoiceModal
                    invoiceId={selectedInvoiceId}
                    onClose={() => {
                        setShowInvoiceModal(false);
                        setSelectedInvoiceId(null);
                    }}
                />
            )}

            <TraceabilityReallocateModal 
                isOpen={isTraceModalOpen}
                onClose={() => {
                    setIsTraceModalOpen(false);
                    // Minimal trigger to re-fetch would be nice, but since this is client side, let's just use the current tab
                    if (activeTab === 'daily') fetchDaily();
                    if (activeTab === 'weekly') fetchWeekly();
                    if (activeTab === 'monthly') fetchMonthly();
                }}
                data={selectedTraceData}
            />`
);

// 4. Traceability Props injection
content = content.replace(/function DailyReport\(\{ data, isClient, fmtDate, activePrefix, setActivePrefix \}/,
    "function DailyReport({ data, isClient, fmtDate, activePrefix, setActivePrefix, setIsTraceModalOpen, setSelectedTraceData }");

content = content.replace(/<DailyReport data=\{dailyData\} isClient=\{isClient\} fmtDate=\{fmtDate\} activePrefix=\{activePrefix\} setActivePrefix=\{setActivePrefix\} \/>/,
    "<DailyReport data={dailyData} isClient={isClient} fmtDate={fmtDate} activePrefix={activePrefix} setActivePrefix={setActivePrefix} setIsTraceModalOpen={setIsTraceModalOpen} setSelectedTraceData={setSelectedTraceData} />");

content = content.replace(/function WeeklyReport\(\{ data, isClient, fmtDate, activePrefix, setActivePrefix \}/,
    "function WeeklyReport({ data, isClient, fmtDate, activePrefix, setActivePrefix, setIsTraceModalOpen, setSelectedTraceData }");

content = content.replace(/<WeeklyReport data=\{weeklyData\} isClient=\{isClient\} fmtDate=\{fmtDate\} activePrefix=\{activePrefix\} setActivePrefix=\{setActivePrefix\} \/>/,
    "<WeeklyReport data={weeklyData} isClient={isClient} fmtDate={fmtDate} activePrefix={activePrefix} setActivePrefix={setActivePrefix} setIsTraceModalOpen={setIsTraceModalOpen} setSelectedTraceData={setSelectedTraceData} />");

content = content.replace(/function MonthlyReport\(\{ data, isClient, fmtDate, activePrefix, setActivePrefix \}/,
    "function MonthlyReport({ data, isClient, fmtDate, activePrefix, setActivePrefix, setIsTraceModalOpen, setSelectedTraceData }");

content = content.replace(/<MonthlyReport data=\{monthlyData\} isClient=\{isClient\} fmtDate=\{fmtDate\} activePrefix=\{activePrefix\} setActivePrefix=\{setActivePrefix\} \/>/,
    "<MonthlyReport data={monthlyData} isClient={isClient} fmtDate={fmtDate} activePrefix={activePrefix} setActivePrefix={setActivePrefix} setIsTraceModalOpen={setIsTraceModalOpen} setSelectedTraceData={setSelectedTraceData} />");

// 5. Replace Headers and Rows (all 3 occurrences)
const targetHeader = "headers={['No.', 'Barcode', 'Nama Item', 'Supplier', 'No. LPB', 'Tgl Beli', 'Qty Beli', 'Total Beli (HPP)', 'Ops', 'Buyer', 'Sales', 'No. Faktur Penjualan', 'No. Surat Jalan', 'Tgl Jual', 'Qty Jual', 'Total Jual (Net)', 'Margin', 'Margin %']}";
const newHeader = "headers={['No.', 'Barcode', 'Nama Item', 'Supplier', 'No. LPB', 'Tgl Beli', 'Qty Beli', 'Total Beli (HPP)', 'Ops', 'Buyer', 'Sales', 'No. Faktur Penjualan', 'No. Surat Jalan', 'Tgl Jual', 'Qty Jual', 'Total Jual (Net)', 'Margin', 'Margin %', 'Aksi']}";

const targetRowEnding = "                            {row['MARGIN %']}\n                        </span>\n                    ])}";
const newRowEnding = `                            {row['MARGIN %']}
                        </span>,
                        row.__DATA__ ? (
                            <button
                                onClick={() => {
                                    setSelectedTraceData({
                                        sdItemId: row.__DATA__.sdItemId,
                                        productId: row.__DATA__.productId,
                                        currentLotId: row.__DATA__.currentLotId,
                                        productName: row['KETERANGAN ITEM'],
                                        buyerName: row['NAMA BUYER'],
                                        sjNumber: row['NOMOR SJ'],
                                        qty: row['QTY JUAL']
                                    });
                                    setIsTraceModalOpen(true);
                                }}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Ubah Rujukan Pembelian (Lot)"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                        ) : <span className="text-xs text-slate-400">-</span>
                    ])}`;

content = content.replaceAll(targetHeader, newHeader);
content = content.replaceAll(targetRowEnding, newRowEnding);

// Also need to add types for these new props in the function signatures
content = content.replace(
    /setActivePrefix: \(val: 'PF' | 'BC' | 'ALL'\) => void }/,
    "setActivePrefix: (val: 'PF' | 'BC' | 'ALL') => void; setIsTraceModalOpen?: any; setSelectedTraceData?: any }"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Patched ReportsDashboard.tsx successfully!");
