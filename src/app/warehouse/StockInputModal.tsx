"use client";

import { useState } from "react";
import { updateStockAction } from "@/app/actions";
import { X, Box, Info } from "lucide-react";
import { cn } from "@/lib/utils";

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
    const [vendorName, setVendorName] = useState("UMUM");
    const [reference, setReference] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!productId || !warehouseId || quantity === 0) return;

        setIsLoading(true);
        try {
            await updateStockAction({ productId, warehouseId, quantity, vendorName, type, reference });
            onClose();
        } catch (error) {
            alert("Gagal memperbarui stok");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
            <div className="bg-white border-2 border-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in duration-300 shadow-slate-900/20">
                <div className="px-8 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 relative">
                    <div className="absolute top-0 left-8 w-12 h-1 bg-primary rounded-b-full" />
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                            <Box className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900">Stock Entry</h2>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Penyesuaian & Inventory Inbound</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 hover:bg-white hover:shadow-md rounded-2xl transition-all border border-slate-200 bg-slate-50 text-slate-400 hover:text-red-500 active:scale-95">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Product</label>
                            <select value={productId} onChange={e => setProductId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-primary focus:bg-white transition-all outline-none appearance-none" required>
                                <option value="">Select Product...</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Warehouse</label>
                            <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-primary focus:bg-white transition-all outline-none appearance-none" required>
                                <option value="">Select Warehouse...</option>
                                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-primary/5 rounded-[2rem] border-2 border-primary/10 border-dashed relative">
                        <div className="absolute -top-3 left-6 px-2 bg-white text-[10px] font-black text-primary uppercase tracking-widest">Adjustment Info</div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Quantity</label>
                            <input type="number" value={quantity} onChange={e => setQuantity(parseInt(e.target.value))} className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-2xl text-lg font-black focus:border-primary transition-all outline-none text-right placeholder:text-slate-200" placeholder="0" required />
                            <div className="flex items-center gap-1.5 ml-1">
                                <Info className="h-3 w-3 text-slate-400" />
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">(+) Masuk / (-) Keluar</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Transaction Type</label>
                            <select value={type} onChange={e => setType(e.target.value as any)} className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-primary transition-all outline-none appearance-none">
                                <option value="ADJUSTMENT">Adjustment</option>
                                <option value="GOODS_RECEIPT">Receipt</option>
                                <option value="SALE">Sale</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Vendor / Pemasok</label>
                            <input value={vendorName} onChange={e => setVendorName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-primary focus:bg-white transition-all outline-none placeholder:text-slate-300" placeholder="UMUM" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Reference / Note (Optional)</label>
                            <input value={reference} onChange={e => setReference(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-medium focus:border-primary focus:bg-white transition-all outline-none placeholder:text-slate-300" placeholder="Contoh: Stock Opname" />
                        </div>
                    </div>

                    <div className="pt-6 flex flex-col md:flex-row gap-3">
                        <button type="button" onClick={onClose} className="order-2 md:order-1 flex-1 py-4 border-2 border-slate-100 rounded-2xl hover:bg-slate-50 text-xs font-black text-slate-500 uppercase tracking-widest transition-all">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={cn(
                                "order-1 md:order-2 flex-[2] py-4 rounded-2xl text-xs font-black text-white uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2",
                                isLoading ? "bg-slate-300 shadow-none cursor-not-allowed" : "bg-primary hover:bg-primary/90 shadow-primary/20"
                            )}
                        >
                            {isLoading ? "Saving..." : "Update Inventory"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
