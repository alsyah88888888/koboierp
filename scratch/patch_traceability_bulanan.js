const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/reports/ReportsDashboard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Traceability Bulanan Fix
const targetBulanan = `                        <span className={cn("tabular-nums font-black text-[10px]", Number(row.MARGIN) >= 0 ? "text-emerald-600" : "text-rose-600")}>
                            {row['MARGIN %'] || '0%'}
                        </span>
                    ])}
                    isClient={isClient}
                    actions={divisionFilterSelect}
                />
            )}`;

const replacementBulanan = `                        <span className={cn("tabular-nums font-black text-[10px]", Number(row.MARGIN) >= 0 ? "text-emerald-600" : "text-rose-600")}>
                            {row['MARGIN %'] || '0%'}
                        </span>,
                        row.__DATA__ ? (
                            <button
                                onClick={() => {
                                    setSelectedTraceData({
                                        sdItemId: row.__DATA__.sdItemId,
                                        productId: row.__DATA__.productId,
                                        currentLotId: row.__DATA__.currentLotId,
                                        productName: row['KETERANGAN ITEM'],
                                        buyerName: row['NAMA BUYER'] || row['NAMA PEMBELI'],
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
                    ])}
                    isClient={isClient}
                    actions={divisionFilterSelect}
                />
            )}`;

content = content.replace(targetBulanan, replacementBulanan);
fs.writeFileSync(filePath, content, 'utf8');
console.log("Patched Traceability Bulanan");
