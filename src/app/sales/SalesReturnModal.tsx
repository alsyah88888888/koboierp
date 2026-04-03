"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { createSalesReturnAction, updateSalesReturnAction } from "@/actions/sales";
import { formatCurrency } from "@/lib/utils";

export function SalesReturnModal({ deliveries, initialData, onClose }: { deliveries: any[], initialData?: any, onClose: () => void }) {
    const [selectedDelivery, setSelectedDelivery] = useState<any>(initialData?.delivery || null);
    const [returnItems, setReturnItems] = useState<{ productId: string, deliveryItemId: string, quantity: number, reason: string }[]>([]);
    const [notes, setNotes] = useState(initialData?.notes || "");
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const handleDeliveryChange = (e: any) => {
        const delivery = deliveries.find(d => d.id === e.target.value);
        setSelectedDelivery(delivery);
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
        if (!selectedDelivery) return alert("Pilih Surat Jalan (SJ) terlebih dahulu.");

        const itemsToReturn = returnItems.filter(i => i.quantity > 0);
        if (itemsToReturn.length === 0) return alert("Minimal satu barang diretur.");

        setIsSubmitting(true);
        try {
            if (initialData) {
                await updateSalesReturnAction(initialData.id, {
                    items: itemsToReturn,
                    notes
                });
                alert("Retur penjualan berhasil diperbarui!");
            } else {
                await createSalesReturnAction({
                    deliveryId: selectedDelivery.id,
                    items: itemsToReturn,
                    notes
                });
                alert("Retur penjualan berhasil diajukan!");
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
                <div className="p-4 md:p-6 border-b flex justify-between items-center bg-blue-50 rounded-t-none md:rounded-t-xl">
                    <h2 className="text-lg md:text-xl font-bold text-blue-800">Form Retur Penjualan</h2>
                    <button onClick={onClose} className="text-blue-600 hover:bg-blue-200 p-2 rounded-full"><X className="h-5 w-5" /></button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    <form id="salesReturnForm" onSubmit={handleSubmit} className="space-y-6">
                        <div className="bg-slate-50 p-4 rounded-xl border space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">
                                    {initialData ? "Surat Jalan (SJ) - Mode Edit" : "Pilih Surat Jalan (SJ)"}
                                </label>
                                {initialData ? (
                                    <div className="w-full p-2 border rounded mt-1 bg-white font-bold text-blue-800">
                                        {initialData.returnNumber} - {initialData.delivery.deliveryNumber} ({initialData.delivery.buyerName})
                                    </div>
                                ) : (
                                    <select
                                        className="w-full p-2 border rounded mt-1 bg-white"
                                        onChange={handleDeliveryChange}
                                        defaultValue=""
                                    >
                                        <option value="" disabled>-- Pilih SJ Terkirim --</option>
                                        {Array.isArray(deliveries) && deliveries.map(d => (
                                            <option key={d.id} value={d.id}>{d.deliveryNumber} - {d.buyerName} ({new Date(d.date || d.createdAt).toLocaleDateString('id-ID')})</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Catatan Retur</label>
                                <textarea
                                    className="w-full p-2 border rounded mt-1 bg-white"
                                    rows={2}
                                    placeholder="Contoh: Barang cacat dari pabrik, salah kirim..."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />
                            </div>
                        </div>

                        {selectedDelivery && (
                            <div className="space-y-4">
                                <div className="hidden md:block border rounded-xl overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-100 text-slate-500 uppercase text-xs">
                                            <tr>
                                                <th className="p-3 text-left">Produk</th>
                                                <th className="p-3 text-right">Qty Kirim</th>
                                                <th className="p-3 text-right">Harga Jual</th>
                                                <th className="p-3 text-right w-32 border-l-2 border-blue-200 bg-blue-50 text-blue-700">Qty Retur</th>
                                                <th className="p-3 text-left border-l bg-blue-50 text-blue-700">Alasan</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {selectedDelivery.items.map((item: any) => {
                                                const retItem = returnItems.find(i => i.deliveryItemId === item.id);
                                                return (
                                                    <tr key={item.id}>
                                                        <td className="p-3 font-medium">
                                                            {item.product?.name || item.productId}
                                                        </td>
                                                        <td className="p-3 text-right">{item.quantity}</td>
                                                        <td className="p-3 text-right text-slate-500">{formatCurrency(Number(item.salesPrice))}</td>
                                                        <td className="p-3 border-l-2 border-blue-200 bg-blue-50/30">
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                max={item.quantity}
                                                                className="w-full p-1.5 border rounded text-right font-bold text-blue-600 focus:ring-2 ring-blue-200"
                                                                value={retItem?.quantity || ""}
                                                                onChange={e => handleQuantityChange(item.id, e.target.value)}
                                                            />
                                                        </td>
                                                        <td className="p-3 border-l bg-blue-50/30">
                                                            <input
                                                                type="text"
                                                                placeholder="Opsional..."
                                                                className="w-full p-1.5 border rounded text-sm"
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

                                {/* Mobile View Items */}
                                <div className="md:hidden space-y-4">
                                    {selectedDelivery.items.map((item: any) => {
                                        const retItem = returnItems.find(i => i.deliveryItemId === item.id);
                                        return (
                                            <div key={item.id} className="border-2 border-blue-100 rounded-xl p-4 space-y-3 bg-white shadow-sm">
                                                <div className="flex justify-between items-start">
                                                    <span className="font-bold text-slate-800 text-sm">{item.product?.name || item.productId}</span>
                                                    <span className="text-xs bg-slate-100 px-2 py-1 rounded font-bold text-slate-600">Max: {item.quantity}</span>
                                                </div>
                                                <div className="flex justify-between text-xs text-slate-500">
                                                    <span>Harga Jual:</span>
                                                    <span>{formatCurrency(Number(item.salesPrice))}</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 items-center pt-2 border-t border-blue-50">
                                                    <div className="col-span-1">
                                                        <label className="text-[10px] font-bold text-blue-700 uppercase">Qty Retur</label>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            max={item.quantity}
                                                            className="w-full p-2 border-2 border-blue-200 rounded text-center font-black text-blue-600 focus:border-blue-500 outline-none"
                                                            value={retItem?.quantity || ""}
                                                            onChange={e => handleQuantityChange(item.id, e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <label className="text-[10px] font-bold text-blue-700 uppercase">Alasan Retur</label>
                                                        <input
                                                            type="text"
                                                            placeholder="Contoh: Rusak"
                                                            className="w-full p-2 border-2 border-blue-200 rounded text-sm outline-none focus:border-blue-500"
                                                            value={retItem?.reason || ""}
                                                            onChange={e => handleReasonChange(item.id, e.target.value)}
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
                        form="salesReturnForm"
                        disabled={isSubmitting || returnItems.filter(i => i.quantity > 0).length === 0}
                        className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-md font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 order-1 md:order-2"
                    >
                        {isSubmitting ? "Memproses..." : initialData ? "Simpan Perubahan" : "Ajukan Retur"}
                    </button>
                </div>
            </div>
        </div>
    );
}
