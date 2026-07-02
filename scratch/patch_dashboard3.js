const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/reports/ReportsDashboard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

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

// Replace globally to catch Weekly and Monthly reports
content = content.replaceAll(targetRowEnding, newRowEnding);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Patched Weekly and Monthly row endings successfully!");
