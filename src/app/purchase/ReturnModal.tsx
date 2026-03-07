"use client";

import { useState, useEffect } from "react";
import { X, Search } from "lucide-react";
import { createPurchaseReturnAction, updatePurchaseReturnAction } from "@/app/actions";
import { formatCurrency } from "@/lib/utils";
import Image from "next/image";

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
        if (!selectedReceipt) return alert("Pilih DO / LPB terlebih dahulu.");

        const itemsToReturn = returnItems.filter(i => i.quantity > 0);
        if (itemsToReturn.length === 0) return alert("Minimal satu barang diretur.");

        setIsSubmitting(true);
        try {
            if (initialData) {
                await updatePurchaseReturnAction(initialData.id, {
                    items: itemsToReturn,
                    notes
                });
                alert("Retur berhasil diperbarui!");
            } else {
                await createPurchaseReturnAction({
                    receiptId: selectedReceipt.id,
                    items: itemsToReturn,
                    notes
                });
                alert("Retur berhasil diajukan!");
            }
            onClose();
        } catch (e: any) {
            alert(e.message || "Gagal memproses retur.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-0 md:p-4">
            <div className="bg-white rounded-none md:rounded-xl shadow-2xl w-full max-w-4xl h-full md:max-h-[90vh] flex flex-col">
                <div className="p-4 md:p-6 border-b flex justify-between items-center bg-rose-50 rounded-t-none md:rounded-t-xl">
                    <h2 className="text-lg md:text-xl font-bold text-rose-800">Form Retur Pembelian</h2>
                    <button onClick={onClose} className="text-rose-600 hover:bg-rose-200 p-2 rounded-full"><X className="h-5 w-5" /></button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    <form id="returnForm" onSubmit={handleSubmit} className="space-y-6">
                        <div className="bg-slate-50 p-4 rounded-xl border space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">
                                    {initialData ? "LPB (Pembelian) - Mode Edit" : "Pilih LPB (Pembelian)"}
                                </label>
                                {initialData ? (
                                    <div className="w-full p-2 border rounded mt-1 bg-white font-bold text-rose-800">
                                        {initialData.returnNumber} - {initialData.receipt.receiptNumber} ({initialData.receipt.receivedFrom})
                                    </div>
                                ) : (
                                    <select
                                        className="w-full p-2 border rounded mt-1 bg-white"
                                        onChange={handleReceiptChange}
                                        defaultValue=""
                                    >
                                        <option value="" disabled>-- Pilih LPB Terverifikasi --</option>
                                        {receipts.filter(r => r.isVerified).map(r => (
                                            <option key={r.id} value={r.id}>{r.receiptNumber} - {r.receivedFrom} ({new Date(r.date || r.createdAt).toLocaleDateString('id-ID')})</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Catatan Retur</label>
                                <textarea
                                    className="w-full p-2 border rounded mt-1 bg-white"
                                    rows={2}
                                    placeholder="Contoh: Barang cacat, tidak sesuai pesanan..."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />
                            </div>
                        </div>

                        {selectedReceipt && (
                            <div className="space-y-4">
                                <div className="hidden md:block border rounded-xl overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-100 text-slate-500 uppercase text-xs">
                                            <tr>
                                                <th className="p-3 text-left">Produk</th>
                                                <th className="p-3 text-right">Qty Beli</th>
                                                <th className="p-3 text-right">Harga Satuan</th>
                                                <th className="p-3 text-right w-32 border-l-2 border-rose-200 bg-rose-50 text-rose-700">Qty Retur</th>
                                                <th className="p-3 text-left border-l bg-rose-50 text-rose-700">Alasan</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {selectedReceipt.items.map((item: any) => {
                                                const retItem = returnItems.find(i => i.productId === item.productId);
                                                return (
                                                    <tr key={item.id}>
                                                        <td className="p-3 font-medium">
                                                            {item.product?.name || item.productId}
                                                        </td>
                                                        <td className="p-3 text-right">{item.quantity}</td>
                                                        <td className="p-3 text-right text-slate-500">{formatCurrency(Number(item.purchasePrice))}</td>
                                                        <td className="p-3 border-l-2 border-rose-200 bg-rose-50/30">
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                max={item.quantity}
                                                                className="w-full p-1.5 border rounded text-right font-bold text-rose-600 focus:ring-2 ring-rose-200"
                                                                value={retItem?.quantity || ""}
                                                                onChange={e => handleQuantityChange(item.productId, e.target.value)}
                                                            />
                                                        </td>
                                                        <td className="p-3 border-l bg-rose-50/30">
                                                            <input
                                                                type="text"
                                                                placeholder="Opsional..."
                                                                className="w-full p-1.5 border rounded text-sm"
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

                                {/* Mobile View Items */}
                                <div className="md:hidden space-y-4">
                                    {selectedReceipt.items.map((item: any) => {
                                        const retItem = returnItems.find(i => i.productId === item.productId);
                                        return (
                                            <div key={item.id} className="border-2 border-rose-100 rounded-xl p-4 space-y-3 bg-white shadow-sm">
                                                <div className="flex justify-between items-start">
                                                    <span className="font-bold text-slate-800 text-sm">{item.product?.name || item.productId}</span>
                                                    <span className="text-xs bg-slate-100 px-2 py-1 rounded font-bold text-slate-600">Max: {item.quantity}</span>
                                                </div>
                                                <div className="flex justify-between text-xs text-slate-500">
                                                    <span>Harga Satuan:</span>
                                                    <span>{formatCurrency(Number(item.purchasePrice))}</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 items-center pt-2 border-t border-rose-50">
                                                    <div className="col-span-1">
                                                        <label className="text-[10px] font-bold text-rose-700 uppercase">Qty Retur</label>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            max={item.quantity}
                                                            className="w-full p-2 border-2 border-rose-200 rounded text-center font-black text-rose-600 focus:border-rose-500 outline-none"
                                                            value={retItem?.quantity || ""}
                                                            onChange={e => handleQuantityChange(item.productId, e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <label className="text-[10px] font-bold text-rose-700 uppercase">Alasan Retur</label>
                                                        <input
                                                            type="text"
                                                            placeholder="Contoh: Rusak"
                                                            className="w-full p-2 border-2 border-rose-200 rounded text-sm outline-none focus:border-rose-500"
                                                            value={retItem?.reason || ""}
                                                            onChange={e => handleReasonChange(item.productId, e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </form>
                </div>

                <div className="p-4 md:p-6 border-t bg-slate-50 flex flex-col md:flex-row justify-end gap-3 rounded-b-none md:rounded-b-xl">
                    <button type="button" onClick={onClose} className="w-full md:w-auto px-6 py-2 text-slate-500 hover:bg-slate-200 rounded-md font-bold transiton-colors order-2 md:order-1">
                        Batal
                    </button>
                    <button
                        type="submit"
                        form="returnForm"
                        disabled={isSubmitting || returnItems.filter(i => i.quantity > 0).length === 0}
                        className="w-full md:w-auto px-6 py-2 bg-rose-600 text-white rounded-md font-bold hover:bg-rose-700 transition-colors disabled:opacity-50 order-1 md:order-2"
                    >
                        {isSubmitting ? "Memproses..." : initialData ? "Simpan Perubahan" : "Ajukan Retur"}
                    </button>
                </div>
            </div>
        </div>
    );
}
