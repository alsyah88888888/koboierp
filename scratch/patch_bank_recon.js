const fs = require('fs');
const file = 'src/app/finance/FinanceDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// Find the candidates container
const target = `
                                            {/* Candidates Container */}
                                            <div className="flex-1 overflow-y-auto max-h-[350px] space-y-3 pr-1 custom-scrollbar">
                                                {(() => {
                                                    const mutDesc = (selectedMutationForMatching.description || "").toLowerCase();
                                                    const mutAmount = Number(selectedMutationForMatching.amount);

                                                    // Filter unmatched candidates
`;

const replacement = `
                                            {/* Candidates Container */}
                                            <div className="flex-1 overflow-y-auto max-h-[350px] space-y-3 pr-1 custom-scrollbar">
                                                {(() => {
                                                    const mutDesc = (selectedMutationForMatching.description || "").toLowerCase();
                                                    const mutAmount = Number(selectedMutationForMatching.amount);

                                                    // INVOICES BELUM LUNAS (UNPAID/PARTIAL)
                                                    const unmatchedPendingInvoices = [];
                                                    if (bankReconSearchQuery.length > 2) {
                                                        const queryLower = bankReconSearchQuery.toLowerCase();
                                                        pendingSales.forEach((s: any) => {
                                                            const unpaid = Number(s.grandTotal || 0) - Number(s.paidAmount || 0);
                                                            if (unpaid > 0 && (
                                                                (s.number || "").toLowerCase().includes(queryLower) ||
                                                                (s.order?.number || "").toLowerCase().includes(queryLower) ||
                                                                (s.buyerName || "").toLowerCase().includes(queryLower)
                                                            )) {
                                                                unmatchedPendingInvoices.push({
                                                                    id: s.id,
                                                                    type: "SALE",
                                                                    title: \`Penjualan: \${s.number} (\${s.buyerName})\`,
                                                                    unpaid,
                                                                    isAmountMatch: unpaid === mutAmount,
                                                                    isAmountClose: Math.abs(unpaid - mutAmount) / (mutAmount || 1) < 0.01
                                                                });
                                                            }
                                                        });
                                                        pendingPurchases.forEach((p: any) => {
                                                            const unpaid = Number(p.grandTotal || 0) - Number(p.paidAmount || 0);
                                                            if (unpaid > 0 && (
                                                                (p.number || "").toLowerCase().includes(queryLower) ||
                                                                (p.poNumber || "").toLowerCase().includes(queryLower) ||
                                                                (p.supplierName || "").toLowerCase().includes(queryLower)
                                                            )) {
                                                                unmatchedPendingInvoices.push({
                                                                    id: p.id,
                                                                    type: "PURCHASE",
                                                                    title: \`Pembelian: \${p.number} (\${p.supplierName})\`,
                                                                    unpaid,
                                                                    isAmountMatch: unpaid === mutAmount,
                                                                    isAmountClose: Math.abs(unpaid - mutAmount) / (mutAmount || 1) < 0.01
                                                                });
                                                            }
                                                        });
                                                    }

                                                    // Filter unmatched candidates
`;

content = content.replace(target, replacement);

const target2 = `                                                    if (unmatchedErpTx.length === 0) {
                                                        return (
                                                            <div className="text-center text-slate-400 py-8 text-[10px] italic uppercase tracking-wider">
                                                                Tidak ada transaksi kas ERP yang cocok ditemukan.<br/>
                                                                <span className="text-[9px] normal-case not-italic text-slate-300 mt-1 block">Coba ketik nominal atau nama vendor di kotak pencarian</span>
                                                            </div>
                                                        );
                                                    }

                                                    return unmatchedErpTx.map((tx: any) => (`;

const replacement2 = `                                                    if (unmatchedErpTx.length === 0 && unmatchedPendingInvoices.length === 0) {
                                                        return (
                                                            <div className="text-center text-slate-400 py-8 text-[10px] italic uppercase tracking-wider">
                                                                Tidak ada transaksi kas ERP yang cocok ditemukan.<br/>
                                                                <span className="text-[9px] normal-case not-italic text-slate-300 mt-1 block">Coba ketik nomor invoice, nominal, atau nama vendor di kotak pencarian</span>
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <>
                                                            {unmatchedPendingInvoices.map((inv: any) => (
                                                                <div key={\`inv-\${inv.id}\`} className="border border-indigo-200 bg-indigo-50/30 rounded-2xl p-4 transition-all flex flex-col space-y-3 relative overflow-hidden">
                                                                    <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-bl-lg">
                                                                        INVOICE BELUM LUNAS
                                                                    </div>
                                                                    <div className="flex justify-between items-start pt-2">
                                                                        <div className="flex-1 min-w-0">
                                                                            <span className="font-mono text-[9px] font-bold text-indigo-400 block uppercase">
                                                                                Pencarian Invoice / Dokumen
                                                                            </span>
                                                                            <span className="font-black text-indigo-900 text-xs block pt-0.5 truncate" title={inv.title}>
                                                                                {inv.title}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex justify-between items-end border-t border-indigo-100/50 pt-2.5">
                                                                        <div>
                                                                            <span className="text-[8px] text-indigo-400 block uppercase tracking-wider">Sisa Tagihan (Unpaid)</span>
                                                                            <span className="font-mono font-black text-xs text-indigo-600">
                                                                                {formatCurrency(inv.unpaid)}
                                                                            </span>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => {
                                                                                // Buka modal pembayaran dengan pre-fill ID invoice
                                                                                setPaymentModal({
                                                                                    open: true,
                                                                                    type: inv.type,
                                                                                    id: inv.id,
                                                                                    total: inv.unpaid,
                                                                                    alreadyPaid: 0,
                                                                                    supplierName: inv.title
                                                                                });
                                                                                setPaymentAmount(selectedMutationForMatching.amount.toString());
                                                                                setPaymentDate(selectedMutationForMatching.date.split("T")[0]);
                                                                            }}
                                                                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm shadow-indigo-600/20"
                                                                        >
                                                                            Bayar via Modal
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {unmatchedErpTx.map((tx: any) => (`;

content = content.replace(target2, replacement2);

// Fix the closing bracket of the return map
const target3 = `                                                            </div>
                                                        </div>
                                                    ));
                                                })()}`;

const replacement3 = `                                                            </div>
                                                        </div>
                                                    ))}
                                                        </>
                                                    );
                                                })()}`;

content = content.replace(target3, replacement3);

fs.writeFileSync(file, content);
console.log("Patched successfully");
