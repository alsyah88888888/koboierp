"use client";

import { useState } from "react";
import { callAction } from "@/proxy";

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
    const [vendorName, setVendorName] = useState("CIBINONG");
    const [reference, setReference] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!productId || !warehouseId || quantity === 0) return;

        setIsLoading(true);
        try {
            await callAction("updateStock", { productId, warehouseId, quantity, vendorName, type, reference });
            onClose();

        } catch (error) {
            alert("Gagal memperbarui stok");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
            <div className="bg-white border-2 border-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in duration-300 shadow-slate-900/20">
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

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {/* Primary Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Product / SKU</label>
                            <select value={productId} onChange={e => setProductId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-primary focus:bg-white transition-all outline-none appearance-none" required>
                                <option value="">Select Product...</option>
                                {Array.isArray(products) && products.map(p => <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Warehouse Location</label>
                            <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-primary focus:bg-white transition-all outline-none appearance-none" required>
                                <option value="">Select Warehouse...</option>
                                {Array.isArray(warehouses) && warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Stock Adjustment Section */}
                    <div className="bg-slate-50/80 border-2 border-slate-100 rounded-[2rem] p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Adjust Quantity</label>
                                <div className="relative">
                                    <input type="number" value={quantity} onChange={e => setQuantity(parseInt(e.target.value))} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-xl font-black focus:border-primary transition-all outline-none text-right placeholder:text-slate-200 pr-12" placeholder="0" required />
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-40">
                                        <Info className="h-3 w-3" />
                                        <p className="text-[8px] font-black uppercase tracking-tighter">(+) In / (-) Out</p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Transaction Type</label>
                                <select value={type} onChange={e => setType(e.target.value as any)} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold focus:border-primary transition-all outline-none appearance-none">
                                    <option value="ADJUSTMENT">Stock Adjustment</option>
                                    <option value="GOODS_RECEIPT">Goods Receipt (LPB)</option>
                                    <option value="SALE">Manual Sales Out</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Vendor / Source</label>
                                <input value={vendorName} onChange={e => setVendorName(e.target.value)} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold focus:border-primary transition-all outline-none placeholder:text-slate-300" placeholder="CIBINONG" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Reference / Note</label>
                                <input value={reference} onChange={e => setReference(e.target.value)} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-sm font-medium focus:border-primary transition-all outline-none placeholder:text-slate-300" placeholder="e.g. Stock Opname Ref #1" />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-200 italic text-[10px] text-slate-400 font-bold tracking-widest text-center uppercase">
                            * Stok akan langsung diperbarui di sistem.
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
