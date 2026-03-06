"use client";

import { useState, useEffect } from "react";
import { X, Box } from "lucide-react";
import { createProductAction } from "@/app/actions";
import { getSuggestedCategory } from "@/lib/categorization";

export function ProductModal({ onClose, onSuccess }: { onClose: () => void, onSuccess?: (product: any) => void }) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        sku: "",
        category: "UMUM",
        uom: "PCS",
        barcode: "",
        lowStockThreshold: 5,
    });

    useEffect(() => {
        const suggestion = getSuggestedCategory(formData.name, formData.sku);
        if (suggestion && formData.category === "UMUM") {
            setFormData(prev => ({ ...prev, category: suggestion }));
        }
    }, [formData.name, formData.sku]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const product = await createProductAction(formData);
            alert("Produk berhasil ditambahkan!");
            if (onSuccess) onSuccess(product);
            onClose();
        } catch (error: any) {
            alert(error.message || "Terjadi kesalahan saat menyimpan data produk.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Box className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Tambah Nama Barang Baru</h2>
                            <p className="text-xs text-slate-500">Form input cepat master produk</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="h-5 w-5 text-slate-500" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5 col-span-2">
                            <label className="text-xs font-bold text-slate-600 uppercase">Nama Barang / Produk *</label>
                            <input
                                required
                                autoFocus
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full p-2.5 border-2 border-slate-200 rounded-lg focus:border-primary outline-none text-sm font-medium"
                                placeholder="Contoh: Kertas HVS A4 80gsm"
                            />
                        </div>
                        <div className="space-y-1.5 ">
                            <label className="text-xs font-bold text-slate-600 uppercase">Kode SKU *</label>
                            <input
                                required
                                value={formData.sku}
                                onChange={e => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                                className="w-full p-2.5 border-2 border-slate-200 rounded-lg focus:border-primary outline-none text-sm font-bold uppercase"
                                placeholder="Contoh: KRT-A4-001"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase">Barcode</label>
                            <input
                                value={formData.barcode}
                                onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                                className="w-full p-2.5 border-2 border-slate-200 rounded-lg focus:border-primary outline-none text-sm font-mono"
                                placeholder="Opsional"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase">Kategori</label>
                            <input
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value.toUpperCase() })}
                                className="w-full p-2.5 border-2 border-slate-200 rounded-lg focus:border-primary outline-none text-sm uppercase"
                                placeholder="UMUM"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase">Satuan (UOM)</label>
                            <input
                                value={formData.uom}
                                onChange={e => setFormData({ ...formData, uom: e.target.value.toUpperCase() })}
                                className="w-full p-2.5 border-2 border-slate-200 rounded-lg focus:border-primary outline-none text-sm uppercase font-bold"
                                placeholder="PCS, LBR, DUS..."
                            />
                        </div>
                    </div>

                    <div className="pt-6 border-t mt-6 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-6 py-2.5 text-sm font-bold bg-primary text-white rounded-lg hover:bg-primary/90 shadow-lg shadow-primary/30 transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {isLoading ? "Menyimpan..." : "Simpan Produk"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
