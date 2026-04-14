"use client";

import { useState, useEffect } from "react";
import { X, Search, FileText, AlertCircle, Save, CheckCircle2 } from "lucide-react";
import { callAction } from "@/proxy";

import { formatCurrency, cn } from "@/lib/utils";
import toast from "react-hot-toast";

export function SalesReturnModal({ deliveries, initialData, onClose }: { deliveries: any[], initialData?: any, onClose: () => void }) {
    const [selectedDelivery, setSelectedDelivery] = useState<any>(initialData?.delivery || null);
    const [returnItems, setReturnItems] = useState<{ productId: string, deliveryItemId: string, quantity: number, reason: string }[]>([]);
    const [notes, setNotes] = useState(initialData?.notes || "");
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Search states
    const [searchTerm, setSearchTerm] = useState(initialData?.delivery?.deliveryNumber || "");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const filteredDeliveries = (deliveries || []).filter(d => 
        d.deliveryNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.buyerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.recipient?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        if (initialData) {
            setSelectedDelivery(initialData.delivery);
            setNotes(initialData.notes || "");
            setReturnItems(initialData.delivery.items.map((di: any) => {
                const existingReturnItem = initialData.items.find((i: any) => i.deliveryItemId === di.id || i.productId === di.productId);
                return {
                    productId: di.productId,
                    deliveryItemId: di.id,
                    quantity: existingReturnItem?.quantity || 0,
                    reason: existingReturnItem?.reason || ""
                };
            }));
        }
    }, [initialData]);

    const onSelectDelivery = (delivery: any) => {
        setSelectedDelivery(delivery);
        setSearchTerm(delivery.deliveryNumber);
        setIsDropdownOpen(false);
        if (delivery) {
            setReturnItems(delivery.items.map((i: any) => ({
                productId: i.productId,
                deliveryItemId: i.id,
                quantity: 0,
                reason: ""
            })));
        } else {
            setReturnItems([]);
        }
    };

    const handleQuantityChange = (deliveryItemId: string, qty: string) => {
        setReturnItems(prev => prev.map(item =>
            item.deliveryItemId === deliveryItemId ? { ...item, quantity: parseInt(qty) || 0 } : item
        ));
    };

    const handleReasonChange = (deliveryItemId: string, reason: string) => {
        setReturnItems(prev => prev.map(item =>
            item.deliveryItemId === deliveryItemId ? { ...item, reason } : item
        ));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDelivery) {
            toast.error("Pilih Surat Jalan (SJ) terlebih dahulu");
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
                await callAction("updateSalesReturn", initialData.id, {
                    items: itemsToReturn,
                    notes
                });
                toast.success("Retur penjualan berhasil diperbarui!");
            } else {
                await callAction("createSalesReturn", {
                    deliveryId: selectedDelivery.id,
                    items: itemsToReturn,
                    notes
                });
                toast.success("Retur penjualan berhasil diajukan!");
            }
            onClose();
        } catch (e: any) {
            toast.error(e.message || "Gagal memproses retur");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate totals
    const totalReturnItems = returnItems.reduce((acc, item) => acc + item.quantity, 0);
    const returnValuation = returnItems.reduce((acc, item) => {
        const deliveryItem = selectedDelivery?.items.find((di: any) => di.id === item.deliveryItemId);
        return acc + (item.quantity * Number(deliveryItem?.salesPrice || 0));
    }, 0);

    return (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[100] flex items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-none md:rounded-3xl shadow-2xl w-full max-w-5xl h-full md:max-h-[95vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                
                {/* Premium Header */}
                <div className="px-6 py-5 border-b bg-white flex justify-between items-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600"></div>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 rounded-xl">
                            <FileText className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">
                                {initialData ? "EDIT RETUR PENJUALAN" : "PENGAJUAN RETUR PENJUALAN"}
                            </h2>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                                {initialData ? initialData.returnNumber : "Customer Service & Returns"}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 hover:bg-slate-100 rounded-full transition-all active:scale-95 text-slate-400 hover:text-slate-600"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-slate-50/50">
                    <form id="salesReturnForm" onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto">
                        
                        {/* Information Grid */}
                        <div className="modal-grid-header">
                            <div className="col-span-1 md:col-span-2">
                                <label className="erp-label">Sumber Surat Jalan (SJ)</label>
                                {initialData ? (
                                    <div className="erp-input flex items-center bg-white font-black text-blue-700 italic border-blue-200">
                                        {initialData.returnNumber} - Ref: {initialData.delivery.deliveryNumber}
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                className="erp-input pl-10 pr-10 cursor-pointer"
                                                placeholder="Cari No. SJ / Nama Pelanggan..."
                                                value={searchTerm}
                                                onChange={(e) => {
                                                    setSearchTerm(e.target.value);
                                                    setIsDropdownOpen(true);
                                                    if (!e.target.value) {
                                                        setSelectedDelivery(null);
                                                        setReturnItems([]);
                                                    }
                                                }}
                                                onFocus={() => setIsDropdownOpen(true)}
                                            />
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                                <Search className="h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                            </div>
                                            {selectedDelivery && (
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedDelivery(null);
                                                        setSearchTerm("");
                                                        setReturnItems([]);
                                                    }}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full"
                                                >
                                                    <X className="h-3 w-3 text-slate-500" />
                                                </button>
                                            )}
                                        </div>

                                        {isDropdownOpen && !initialData && (
                                            <>
                                                <div className="fixed inset-0 z-[110]" onClick={() => setIsDropdownOpen(false)} />
                                                <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 z-[120] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                                        {filteredDeliveries.length > 0 ? (
                                                            filteredDeliveries.map((d) => (
                                                                <button
                                                                    key={d.id}
                                                                    type="button"
                                                                    onClick={() => onSelectDelivery(d)}
                                                                    className="w-full text-left px-5 py-4 hover:bg-blue-50 border-b border-slate-50 last:border-none transition-colors group flex items-start gap-3"
                                                                >
                                                                    <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-blue-100/50 transition-colors">
                                                                        <FileText className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-black text-slate-900 text-sm">{d.deliveryNumber}</div>
                                                                        <div className="text-xs font-bold text-slate-500 group-hover:text-blue-700">{d.buyerName}</div>
                                                                        <div className="text-[10px] text-slate-400 mt-1">{new Date(d.date || d.createdAt).toLocaleDateString('id-ID')} - {d.recipient || "Tanpa Penerima"}</div>
                                                                    </div>
                                                                </button>
                                                            ))
                                                        ) : (
                                                            <div className="px-5 py-8 text-center">
                                                                <div className="inline-flex p-3 bg-slate-50 rounded-full mb-2">
                                                                    <Search className="h-5 w-5 text-slate-300" />
                                                                </div>
                                                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Tidak ditemukan</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                                <p className="text-[10px] text-slate-400 mt-1.5 ml-1 italic font-medium">
                                    *Pilih Surat Jalan yang sudah terkirim untuk melihat daftar item barang.
                                </p>
                            </div>

                            <div className="col-span-1 md:col-span-1">
                                <label className="erp-label">Catatan Retur Pelanggan</label>
                                <textarea
                                    className="erp-input h-auto py-3 min-h-[44px] resize-none"
                                    rows={1}
                                    placeholder="Alasan retur, misal: Barang Cacat..."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />
                            </div>
                        </div>

                        {selectedDelivery ? (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-500">
                                <div className="flex items-center justify-between mb-4 px-1">
                                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                                        Item dalam Surat Jalan
                                        <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px]">{selectedDelivery.items.length} Barang</span>
                                    </h3>
                                    <div className="text-xs font-bold text-slate-400 italic">
                                        Customer: <span className="text-slate-900">{selectedDelivery.buyerName}</span>
                                    </div>
                                </div>

                                <div className="table-container shadow-lg border-2 border-slate-100">
                                    <div className="table-responsive">
                                        <table className="table-erp">
                                            <thead>
                                                <tr>
                                                    <th className="w-12 text-center">No</th>
                                                    <th>Nama Barang</th>
                                                    <th className="text-right">Qty Kirim</th>
                                                    <th className="text-right">Harga Jual</th>
                                                    <th className="text-center w-32 bg-blue-50/50 text-blue-700 border-x-2 border-blue-100">Qty Retur</th>
                                                    <th className="w-48">Keterangan</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedDelivery.items.map((item: any, idx: number) => {
                                                    const retItem = returnItems.find(i => i.deliveryItemId === item.id);
                                                    return (
                                                        <tr key={item.id} className={cn(retItem?.quantity ? "bg-blue-50/20" : "")}>
                                                            <td className="text-center font-bold text-slate-400">{idx + 1}</td>
                                                            <td>
                                                                <div className="font-black text-slate-900">{item.product?.name || item.productId}</div>
                                                                <div className="text-[10px] text-slate-500 font-mono tracking-tighter uppercase">{item.product?.sku || "Non-SKU"}</div>
                                                            </td>
                                                            <td className="text-right tabular-nums font-bold text-slate-600">
                                                                {item.quantity} <span className="text-[10px] text-slate-400 ml-0.5">{item.uom || "PCS"}</span>
                                                            </td>
                                                            <td className="text-right tabular-nums text-slate-600 font-medium italic">
                                                                {formatCurrency(Number(item.salesPrice))}
                                                            </td>
                                                            <td className="bg-blue-50/40 border-x-2 border-blue-100 p-2">
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    max={item.quantity}
                                                                    className="w-full bg-white border-2 border-blue-100 px-3 py-1.5 rounded-lg text-right font-black text-blue-600 focus:border-blue-500 outline-none transition-all"
                                                                    value={retItem?.quantity || ""}
                                                                    onChange={e => handleQuantityChange(item.id, e.target.value)}
                                                                />
                                                            </td>
                                                            <td className="p-2">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Catatan..."
                                                                    className="w-full bg-white border-2 border-slate-100 px-3 py-1.5 rounded-lg text-[11px] font-medium placeholder:text-slate-300 focus:border-slate-300 outline-none"
                                                                    value={retItem?.reason || ""}
                                                                    onChange={e => handleReasonChange(item.id, e.target.value)}
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
                                    Pilih Surat Jalan Terlebih Dahulu<br/>
                                    <span className="font-medium normal-case tracking-normal text-xs text-slate-300">Daftar item akan muncul setelah Anda memilih No. SJ</span>
                                </h3>
                            </div>
                        )}
                    </form>
                </div>

                {/* ERP Premium Footer Summary */}
                <div className="p-6 md:p-8 bg-slate-900 border-t border-white/10 relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 opacity-50"></div>
                    
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-8">
                            <div className="text-center md:text-left">
                                <div className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Total Item Diretur</div>
                                <div className="text-3xl font-black text-white tabular-nums drop-shadow-sm">
                                    {totalReturnItems} <span className="text-sm font-bold text-white/40 ml-1 uppercase">PCS</span>
                                </div>
                            </div>
                            <div className="h-12 w-px bg-white/10 hidden md:block"></div>
                            <div className="text-center md:text-left">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Estimasi Nilai Jual Retur</div>
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
                                form="salesReturnForm"
                                disabled={isSubmitting || returnItems.filter(i => i.quantity > 0).length === 0}
                                className="flex-1 md:flex-none erp-btn-primary bg-blue-600 hover:bg-blue-500 shadow-blue-900/40 min-w-[200px]"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Memproses...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        {initialData ? <Save className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                                        {initialData ? "Simpan Perubahan" : "Konfirmasi Retur Jual"}
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
