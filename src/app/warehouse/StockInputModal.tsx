"use client";

import { useState } from "react";
import { updateStockAction } from "@/app/actions";
import { X } from "lucide-react";

interface Product {
    id: string;
    sku: string;
    name: string;
}

interface Warehouse {
    id: string;
    name: string;
}

export function StockInputModal({ products, warehouses, onClose }: { products: Product[], warehouses: Warehouse[], onClose: () => void }) {
    const [productId, setProductId] = useState("");
    const [warehouseId, setWarehouseId] = useState("");
    const [quantity, setQuantity] = useState(0);
    const [type, setType] = useState<"ADJUSTMENT" | "SALE" | "GOODS_RECEIPT">("ADJUSTMENT");
    const [reference, setReference] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!productId || !warehouseId || quantity === 0) return;

        await updateStockAction({ productId, warehouseId, quantity, type, reference });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white border-2 border-slate-300 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b-2 border-slate-100 flex justify-between items-center bg-slate-50">
                    <h2 className="text-xl font-bold text-slate-900">Stock Entry / Adjustment</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors border border-slate-200 bg-white">
                        <X className="h-5 w-5 text-slate-600" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-5 bg-white">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-slate-500">Product</label>
                        <select value={productId} onChange={e => setProductId(e.target.value)} className="w-full p-2.5 bg-white border-2 border-slate-300 rounded-lg text-sm font-medium focus:border-primary transition-all outline-none" required>
                            <option value="">Select Product...</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-slate-500">Warehouse</label>
                        <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="w-full p-2.5 bg-white border-2 border-slate-300 rounded-lg text-sm font-medium focus:border-primary transition-all outline-none" required>
                            <option value="">Select Warehouse...</option>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500">Adjustment Qty</label>
                            <input type="number" value={quantity} onChange={e => setQuantity(parseInt(e.target.value))} className="w-full p-2.5 bg-white border-2 border-slate-300 rounded-lg text-sm font-bold focus:border-primary transition-all outline-none text-right" required />
                            <p className="text-[10px] text-slate-400 font-bold ml-1">Positive (+) IN, Negative (-) OUT</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500">Type</label>
                            <select value={type} onChange={e => setType(e.target.value as any)} className="w-full p-2.5 bg-white border-2 border-slate-300 rounded-lg text-sm font-medium focus:border-primary transition-all outline-none">
                                <option value="ADJUSTMENT">Adjustment</option>
                                <option value="GOODS_RECEIPT">Receipt</option>
                                <option value="SALE">Sale</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-slate-500">Reference (Optional)</label>
                        <input value={reference} onChange={e => setReference(e.target.value)} className="w-full p-2.5 bg-white border-2 border-slate-300 rounded-lg text-sm font-medium focus:border-primary transition-all outline-none" placeholder="e.g. Stock Opname 2024" />
                    </div>

                    <div className="pt-6 border-t-2 border-slate-100 flex justify-end gap-3 mt-4">
                        <button type="button" onClick={onClose} className="px-6 py-2.5 border-2 border-slate-300 rounded-xl hover:bg-slate-50 font-bold text-slate-600 transition-all"><span className="text-slate-600">Cancel</span></button>
                        <button type="submit" className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold shadow-xl shadow-emerald-200 border-2 border-emerald-600 transition-all active:scale-95">
                            <span className="text-white">Masuk</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
