"use client";

import { useState, useMemo } from "react";
import { createPurchaseRequestAction } from "@/app/actions";
import { Plus, Trash2, X, ClipboardList, Calculator } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface RequestItem {
    itemName: string;
    quantity: number | "";
    estimatedPrice: number | "";
}

export function PurchaseRequestModal({ onClose }: { onClose: () => void }) {
    const [notes, setNotes] = useState("");
    const [items, setItems] = useState<RequestItem[]>([{ itemName: "", quantity: 1, estimatedPrice: 0 }]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const addItem = () => setItems([...items, { itemName: "", quantity: 1, estimatedPrice: 0 }]);
    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        if (field === 'quantity') {
            const val = parseInt(value);
            (newItems[index] as any)[field] = isNaN(val) ? "" : val;
        } else if (field === 'estimatedPrice') {
            const val = parseFloat(value);
            (newItems[index] as any)[field] = isNaN(val) ? "" : val;
        } else {
            (newItems[index] as any)[field] = value;
        }

        newItems[index][field as keyof RequestItem] = value;
        setItems(newItems);
    };

    const totalEstimation = useMemo(() => {
        return items.reduce((acc, item) => {
            const q = Number(item.quantity) || 0;
            const p = Number(item.estimatedPrice) || 0;
            return acc + (q * p);
        }, 0);
    }, [items]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const hasEmptyItems = items.some(i => !i.itemName || i.quantity === "" || i.estimatedPrice === "");
        if (hasEmptyItems) {
            alert("Mohon lengkapi nama barang, quantity, dan estimasi harga.");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await createPurchaseRequestAction({
                notes,
                items: items.map(i => ({
                    itemName: i.itemName,
                    quantity: Number(i.quantity),
                    estimatedPrice: Number(i.estimatedPrice)
                }))
            });
            if (res.success) {
                alert(`Pengajuan berhasil dibuat: ${res.prNumber}`);
                onClose();
            }
        } catch (error: any) {
            alert(error.message || "Gagal membuat pengajuan");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <ClipboardList className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Buat Pengajuan Pembelian</h2>
                            <p className="text-xs text-slate-500">Ajukan kebutuhan stok barang ke Admin Pusat.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="h-6 w-6 text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Notes Area */}
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Keterangan / Alasan Pengajuan</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Contoh: Stok barang sisa sedikit, kebutuhan proyek X..."
                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none min-h-[100px]"
                        />
                    </div>

                    {/* Table Area */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Daftar Barang yang Diajukan</label>
                            <button
                                type="button"
                                onClick={addItem}
                                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                            >
                                <Plus className="h-3 w-3" /> Tambah Baris
                            </button>
                        </div>

                        <div className="overflow-hidden border-2 border-slate-100 rounded-xl">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b-2 border-slate-100">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-bold text-slate-600">Nama Barang (Kebutuhan Office)</th>
                                        <th className="px-4 py-3 text-right font-bold text-slate-600 w-24">Qty</th>
                                        <th className="px-4 py-3 text-right font-bold text-slate-600 w-40">Estimasi Harga Satuan</th>
                                        <th className="px-4 py-3 text-right font-bold text-slate-600 w-40">Total Estimasi</th>
                                        <th className="w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {items.map((item, index) => (
                                        <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-2">
                                                <input
                                                    placeholder="Contoh: Kertas A4, CCTV, Komputer..."
                                                    className="w-full p-2 bg-transparent border-none focus:ring-0 text-sm font-medium"
                                                    value={item.itemName}
                                                    onChange={e => updateItem(index, 'itemName', e.target.value)}
                                                />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={e => updateItem(index, 'quantity', e.target.value)}
                                                    className="w-full p-2 bg-transparent border-none text-right focus:ring-0 font-mono"
                                                />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input
                                                    type="number"
                                                    value={item.estimatedPrice}
                                                    onChange={e => updateItem(index, 'estimatedPrice', e.target.value)}
                                                    className="w-full p-2 bg-transparent border-none text-right focus:ring-0 font-mono"
                                                />
                                            </td>
                                            <td className="px-4 py-2 text-right font-bold text-slate-700">
                                                {formatCurrency(Number(item.quantity || 0) * Number(item.estimatedPrice || 0))}
                                            </td>
                                            <td className="px-2">
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(index)}
                                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </form>

                {/* Footer */}
                <div className="p-6 border-t bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white border-2 border-slate-100 rounded-xl flex items-center gap-3">
                            <Calculator className="h-5 w-5 text-slate-400" />
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">Total Estimasi Pengajuan</p>
                                <p className="text-xl font-black text-primary mt-1">{formatCurrency(totalEstimation)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 md:flex-none px-8 py-3 rounded-xl font-bold bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex-1 md:flex-none px-8 py-3 rounded-xl font-bold bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isSubmitting ? "Mengirim..." : "Kirim Pengajuan"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
