"use client";

import { useState, useEffect } from "react";
import { X, Search, FileText, AlertCircle, Save, CheckCircle2 } from "lucide-react";
import { createPurchaseReturnAction, updatePurchaseReturnAction } from "@/app/actions";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

export function ReturnModal({ receipts, initialData, onClose }: { receipts: any[], initialData?: any, onClose: () => void }) {
    const [selectedReceipt, setSelectedReceipt] = useState<any>(initialData?.receipt || null);
    const [returnItems, setReturnItems] = useState<{ productId: string, quantity: number, reason: string }[]>([]);
    const [notes, setNotes] = useState(initialData?.notes || "");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (initialData) {
            setSelectedReceipt(initialData.receipt);
            setNotes(initialData.notes || "");
            setReturnItems(initialData.receipt.items.map((ri: any) => {
                const existingReturnItem = initialData.items.find((i: any) => i.productId === ri.productId);
                return {
                    productId: ri.productId,
                    quantity: existingReturnItem?.quantity || 0,
                    reason: existingReturnItem?.reason || ""
                };
            }));
        }
    }, [initialData]);

    const handleReceiptChange = (e: any) => {
        const receipt = receipts.find(r => r.id === e.target.value);
        setSelectedReceipt(receipt);
        if (receipt) {
            setReturnItems(receipt.items.map((i: any) => ({
                productId: i.productId,
                quantity: 0,
                reason: ""
            })));
        } else {
            setReturnItems([]);
        }
    };

    const handleQuantityChange = (productId: string, qty: string) => {
        setReturnItems(prev => prev.map(item =>
            item.productId === productId ? { ...item, quantity: parseInt(qty) || 0 } : item
        ));
    };

    const handleReasonChange = (productId: string, reason: string) => {
        setReturnItems(prev => prev.map(item =>
            item.productId === productId ? { ...item, reason } : item
        ));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedReceipt) {
            toast.error("Pilih LPB terlebih dahulu");
            return;
        }

        const itemsToReturn = returnItems.filter(i => i.quantity > 0);
        if (itemsToReturn.length === 0) {
            toast.error("Minimal satu barang diretur");
            return;
        }

        setIsSubmitting(true);
        try {
            if (initialData) {
                await updatePurchaseReturnAction(initialData.id, {
                    items: itemsToReturn,
                    notes
                });
                toast.success("Retur berhasil diperbarui!");
            } else {
                await createPurchaseReturnAction({
                    receiptId: selectedReceipt.id,
                    items: itemsToReturn,
                    notes
                });
                toast.success("Retur berhasil diajukan!");
            }
            onClose();
        } catch (e: any) {
            toast.error(e.message || "Gagal memproses retur");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate return value impact
    const totalReturnItems = returnItems.reduce((acc, item) => acc + item.quantity, 0);
    const returnValuation = returnItems.reduce((acc, item) => {
        const receiptItem = selectedReceipt?.items.find((ri: any) => ri.productId === item.productId);
        return acc + (item.quantity * Number(receiptItem?.purchasePrice || 0));
    }, 0);

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-none md:rounded-3xl shadow-2xl w-full max-w-5xl h-full md:max-h-[95vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                
                {/* Premium Header */}
                <div className="px-6 py-5 border-b bg-white flex justify-between items-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-600"></div>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-rose-50 rounded-xl">
                            <FileText className="h-6 w-6 text-rose-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">
                                {initialData ? "EDIT RETUR PEMBELIAN" : "PENGAJUAN RETUR PEMBELIAN"}
                            </h2>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                                {initialData ? initialData.returnNumber : "Form Inventaris & Stok"}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 hover:bg-slate-100 rounded-full transition-all active:scale-95"
                    >
                        <X className="h-6 w-6 text-slate-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-slate-50/50">
                    <form id="returnForm" onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto">
                        
                        {/* Information Grid */}
                        <div className="modal-grid-header">
                            <div className="col-span-1 md:col-span-2">
                                <label className="erp-label">Sumber LPB (Penerimaan Barang)</label>
                                {initialData ? (
                                    <div className="erp-input flex items-center bg-white font-black text-rose-700 italic border-rose-200">
                                        {initialData.returnNumber} - LPB: {initialData.receipt.receiptNumber}
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <select
                                            className="erp-input appearance-none bg-white pr-10"
                                            onChange={handleReceiptChange}
                                            defaultValue=""
                                        >
                                            <option value="" disabled>Pilih LPB Terverifikasi...</option>
                                            {receipts.filter(r => r.isVerified).map(r => (
                                                <option key={r.id} value={r.id}>
                                                    {r.receiptNumber} — {r.receivedFrom} ({new Date(r.date || r.createdAt).toLocaleDateString('id-ID')})
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <FileText className="h-4 w-4 text-slate-400" />
                                        </div>
                                    </div>
                                )}
                                <p className="text-[10px] text-slate-400 mt-1.5 ml-1 italic italic italic italic italic italic italic italic italic">
                                    *Hanya LPB yang sudah terverifikasi yang dapat diajukan retur.
                                </p>
                            </div>

                            <div className="col-span-1 md:col-span-1">
                                <label className="erp-label">Catatan Retur</label>
                                <textarea
                                    className="erp-input h-auto py-3 min-h-[44px] resize-none"
                                    rows={1}
                                    placeholder="Alasan utama pengajuan..."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />
                            </div>
                        </div>

                        {selectedReceipt ? (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-500">
                                <div className="flex items-center justify-between mb-4 px-1">
                                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                                        Item Tersedia dalam LPB
                                        <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px]">{selectedReceipt.items.length} Barang</span>
                                    </h3>
                                    <div className="text-xs font-bold text-slate-400 italic">
                                        Vendor: <span className="text-slate-900">{selectedReceipt.receivedFrom}</span>
                                    </div>
                                </div>

                                <div className="table-container shadow-lg border-2 border-slate-100">
                                    <div className="table-responsive">
                                        <table className="table-erp">
                                            <thead>
                                                <tr>
                                                    <th className="w-12 text-center">No</th>
                                                    <th>Nama Barang</th>
                                                    <th className="text-right">Qty LPB</th>
                                                    <th className="text-right">Hpp Satuan</th>
                                                    <th className="text-center w-32 bg-rose-50/50 text-rose-700 border-x-2 border-rose-100">Qty Retur</th>
                                                    <th className="w-48">Alasan Spesifik</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedReceipt.items.map((item: any, idx: number) => {
                                                    const retItem = returnItems.find(i => i.productId === item.productId);
                                                    return (
                                                        <tr key={item.id} className={retItem?.quantity ? "bg-rose-50/20" : ""}>
                                                            <td className="text-center font-bold text-slate-400">{idx + 1}</td>
                                                            <td>
                                                                <div className="font-black text-slate-900">{item.product?.name || item.productId}</div>
                                                                <div className="text-[10px] text-slate-500 font-mono tracking-tighter uppercase">{item.product?.barcode || "Non-Barcode"}</div>
                                                            </td>
                                                            <td className="text-right tabular-nums font-bold text-slate-600">
                                                                {item.quantity} <span className="text-[10px] text-slate-400 ml-0.5">{item.uom || "PCS"}</span>
                                                            </td>
                                                            <td className="text-right tabular-nums text-slate-600 font-medium italic">
                                                                {formatCurrency(Number(item.purchasePrice))}
                                                            </td>
                                                            <td className="bg-rose-50/40 border-x-2 border-rose-100 p-2">
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    max={item.quantity}
                                                                    className="w-full bg-white border-2 border-rose-100 px-3 py-1.5 rounded-lg text-right font-black text-rose-600 focus:border-rose-500 outline-none transition-all"
                                                                    value={retItem?.quantity || ""}
                                                                    onChange={e => handleQuantityChange(item.productId, e.target.value)}
                                                                />
                                                            </td>
                                                            <td className="p-2">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Misal: Cacat..."
                                                                    className="w-full bg-white border-2 border-slate-100 px-3 py-1.5 rounded-lg text-[11px] font-medium placeholder:text-slate-300 focus:border-slate-300 outline-none"
                                                                    value={retItem?.reason || ""}
                                                                    onChange={e => handleReasonChange(item.productId, e.target.value)}
                                                                />
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                                <div className="p-4 bg-white rounded-full shadow-sm border border-slate-100 mb-4 animate-bounce">
                                    <AlertCircle className="h-10 w-10 text-slate-300" />
                                </div>
                                <h3 className="text-slate-400 font-black uppercase tracking-widest text-sm text-center">
                                    Pilih LPB Terlebih Dahulu<br/>
                                    <span className="font-medium normal-case tracking-normal text-xs text-slate-300">Data item akan muncul setelah Anda memilih LPB</span>
                                </h3>
                            </div>
                        )}
                    </form>
                </div>

                {/* ERP Premium Footer Summary */}
                <div className="p-6 md:p-8 bg-slate-900 border-t border-white/10 relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 opacity-50"></div>
                    
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-8">
                            <div className="text-center md:text-left">
                                <div className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] mb-1">Total Item Diretur</div>
                                <div className="text-3xl font-black text-white tabular-nums drop-shadow-sm">
                                    {totalReturnItems} <span className="text-sm font-bold text-white/40 ml-1 uppercase">PCS</span>
                                </div>
                            </div>
                            <div className="h-12 w-px bg-white/10 hidden md:block"></div>
                            <div className="text-center md:text-left">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Estimasi Potongan HPP</div>
                                <div className="text-3xl font-black text-white px-4 py-1.5 bg-white/5 rounded-2xl border border-white/5 tabular-nums">
                                    {formatCurrency(returnValuation)}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <button 
                                onClick={onClose}
                                className="flex-1 md:flex-none px-8 py-3.5 text-slate-400 font-bold hover:text-white transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                form="returnForm"
                                disabled={isSubmitting || returnItems.filter(i => i.quantity > 0).length === 0}
                                className="flex-1 md:flex-none erp-btn-primary bg-rose-600 hover:bg-rose-500 shadow-rose-900/40 min-w-[200px]"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Memproses...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        {initialData ? <Save className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                                        {initialData ? "Simpan Perubahan" : "Konfirmasi Retur"}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
