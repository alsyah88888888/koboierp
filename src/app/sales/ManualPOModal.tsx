"use client";

import { useState } from "react";
import { X, Save, ShoppingBag, User, Package, Hash, Calendar } from "lucide-react";
import { callAction } from "@/proxy";

import { cn } from "@/lib/utils";

interface ManualPOModalProps {
    products: any[];
    warehouses: any[];
    onClose: () => void;
}

export function ManualPOModal({ products, warehouses, onClose }: ManualPOModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        deliveryNumber: "",
        buyerName: "",
        recipient: "",
        warehouseId: (Array.isArray(warehouses) && warehouses.length > 0) ? warehouses[0]?.id : "",
        salesPerson: "BC",
        items: [{ productId: "", quantity: 0, price: 0 }]
    });

    const handleAddItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { productId: "", quantity: 0, price: 0 }]
        }));
    };

    const handleRemoveItem = (index: number) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.deliveryNumber || !formData.buyerName) {
            alert("Harap isi No. SJ and Nama Buyer.");
            return;
        }

        setIsLoading(true);
        try {
            await callAction("createManualSales", formData);

            alert("Data penjualan manual berhasil disimpan.");
            onClose();
        } catch (error: any) {
            alert(error.message || "Gagal menyimpan data.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 opacity-100">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-white/20">
                {/* Header */}
                <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center relative">
                    <div className="absolute top-0 left-8 w-20 h-1.5 bg-primary rounded-b-full shadow-[0_2px_10px_rgba(var(--primary-rgb),0.3)]" />
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-inner">
                            <ShoppingBag className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Manual SJ/PO Entry</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Input Penjualan Manual</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-200 hover:shadow-sm active:scale-90"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* Primary Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                <Hash className="h-3 w-3" /> No. Surat Jalan / PO
                            </label>
                            <input
                                required
                                value={formData.deliveryNumber}
                                onChange={e => setFormData(p => ({ ...p, deliveryNumber: e.target.value }))}
                                className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-primary focus:bg-white transition-all font-bold text-slate-800 shadow-sm"
                                placeholder="Cth: SJ/2026/001"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                <User className="h-3 w-3" /> Nama Buyer / Toko
                            </label>
                            <input
                                required
                                value={formData.buyerName}
                                onChange={e => setFormData(p => ({ ...p, buyerName: e.target.value }))}
                                className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-primary focus:bg-white transition-all font-bold text-slate-800 shadow-sm"
                                placeholder="Cth: PT. Maju Bersama"
                            />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                <Calendar className="h-3 w-3" /> Alamat Lengkap / Keterangan
                            </label>
                            <textarea
                                value={formData.recipient}
                                onChange={e => setFormData(p => ({ ...p, recipient: e.target.value }))}
                                className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-primary focus:bg-white transition-all font-bold text-slate-800 shadow-sm min-h-[80px]"
                                placeholder="Alamat pengiriman..."
                            />
                        </div>
                        {/* Data Type & Warehouse */}
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Kategori (Prefix)</label>
                                <select
                                    value={formData.salesPerson}
                                    onChange={e => setFormData(p => ({ ...p, salesPerson: e.target.value }))}
                                    className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-primary focus:bg-white transition-all font-bold text-slate-800 shadow-sm appearance-none"
                                >
                                    <option value="BC">BC (Regular / Sales)</option>
                                    <option value="PF">PF (Project Finance)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Gudang Pengeluaran</label>
                                <select
                                    value={formData.warehouseId}
                                    onChange={e => setFormData(p => ({ ...p, warehouseId: e.target.value }))}
                                    className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-primary focus:bg-white transition-all font-bold text-slate-800 shadow-sm appearance-none"
                                >
                                    {Array.isArray(warehouses) && warehouses.map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Items Section */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                <Package className="h-4 w-4 text-primary" /> Daftar Barang
                            </h4>
                            <button
                                type="button"
                                onClick={handleAddItem}
                                className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                            >
                                + Tambah Baris
                            </button>
                        </div>
                        
                        <div className="space-y-3">
                            {formData.items.map((item, index) => (
                                <div key={index} className="flex gap-3 items-end bg-slate-50 p-4 rounded-2xl border border-slate-100 group transition-all hover:bg-white hover:shadow-md">
                                    <div className="flex-1 space-y-1.5">
                                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Produk</label>
                                        <select
                                            required
                                            value={item.productId}
                                            onChange={e => handleItemChange(index, "productId", e.target.value)}
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-primary transition-all text-xs font-bold"
                                        >
                                            <option value="">Pilih Produk</option>
                                            {Array.isArray(products) && products.map(p => (
                                                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-24 space-y-1.5">
                                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Qty</label>
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            value={item.quantity}
                                            onChange={e => handleItemChange(index, "quantity", Number(e.target.value))}
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-primary transition-all text-xs font-black"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveItem(index)}
                                        className="p-3 text-slate-300 hover:text-red-500 transition-colors"
                                        disabled={formData.items.length === 1}
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </form>

                <div className="p-8 bg-slate-50/80 border-t border-slate-100 flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-white transition-all active:scale-95 border border-transparent hover:border-slate-200"
                        disabled={isLoading}
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="px-10 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest text-white bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all active:scale-95 flex items-center gap-3 disabled:opacity-50"
                    >
                        {isLoading ? (
                            <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        {isLoading ? "Saving..." : "Simpan Penjualan"}
                    </button>
                </div>
            </div>
        </div>
    );
}
