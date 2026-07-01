"use client";

import { useState, useMemo } from "react";
import { X, ArrowRight, AlertCircle, CheckCircle2, Loader2, Search, ArrowLeftRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { callAction } from "@/proxy";

interface StockTransferModalProps {
    products: any[];
    warehouses: any[];
    onClose: () => void;
    onSuccess: () => void;
    preselectedProduct?: any;
    preselectedStock?: any;
}

export function StockTransferModal({ products, warehouses, onClose, onSuccess, preselectedProduct, preselectedStock }: StockTransferModalProps) {
    const { data: session } = useSession() as any;

    const [productSearch, setProductSearch] = useState(preselectedProduct?.name || "");
    const [selectedProduct, setSelectedProduct] = useState<any>(preselectedProduct || null);
    const [fromWarehouseId, setFromWarehouseId] = useState(preselectedStock?.warehouseId || "");
    const [fromVendorName, setFromVendorName] = useState(preselectedStock?.vendorName || "");
    const [toWarehouseId, setToWarehouseId] = useState("");
    const [toVendorName, setToVendorName] = useState("CIBINONG");
    const [quantity, setQuantity] = useState<number | "">("");
    const [notes, setNotes] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    const filteredProducts = useMemo(() => {
        if (!productSearch) return products.slice(0, 20);
        const q = productSearch.toLowerCase();
        return products.filter(p =>
            p.name?.toLowerCase().includes(q) ||
            p.sku?.toLowerCase().includes(q) ||
            p.barcode?.toLowerCase().includes(q)
        ).slice(0, 20);
    }, [products, productSearch]);

    // Get stock entries for selected product
    const productStocks = useMemo(() => {
        if (!selectedProduct) return [];
        return (selectedProduct.stocks || []).map((s: any) => {
            const wh = warehouses.find((w: any) => w.id === s.warehouseId);
            return { ...s, warehouseName: wh?.name || s.warehouseId };
        });
    }, [selectedProduct, warehouses]);

    const sourceStock = productStocks.find((s: any) => s.warehouseId === fromWarehouseId && s.vendorName === fromVendorName);
    const sourceQty = sourceStock ? Number(sourceStock.quantity) : 0;

    const handleSelectProduct = (product: any) => {
        setSelectedProduct(product);
        setProductSearch(product.name);
        setShowDropdown(false);
        setFromWarehouseId("");
        setFromVendorName("CIBINONG");
        setToWarehouseId("");
        setQuantity("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct || !fromWarehouseId || !toWarehouseId || !quantity || Number(quantity) <= 0) {
            alert("Lengkapi semua field terlebih dahulu.");
            return;
        }
        if (Number(quantity) > sourceQty) {
            alert(`Stok tidak cukup. Tersedia: ${sourceQty}`);
            return;
        }

        setIsLoading(true);
        try {
            const res = await callAction("transferStock", {
                productId: selectedProduct.id,
                fromWarehouseId,
                fromVendorName,
                toWarehouseId,
                toVendorName,
                quantity: Number(quantity),
                notes: notes || `Mutasi barang`,
                transferredBy: session?.user?.name || "Admin"
            });
            setResult({ success: true, message: `Berhasil! Ref: ${res.reference}` });
            setTimeout(() => { onSuccess(); onClose(); }, 1500);
        } catch (err: any) {
            setResult({ success: false, message: err.message || "Gagal melakukan mutasi." });
        } finally {
            setIsLoading(false);
        }
    };

    const fromWh = warehouses.find((w: any) => w.id === fromWarehouseId);
    const toWh = warehouses.find((w: any) => w.id === toWarehouseId);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="bg-gradient-to-br from-violet-600 to-violet-800 p-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.08),transparent_70%)]" />
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/15 rounded-xl">
                                <ArrowLeftRight className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-black text-white text-lg tracking-tight">Mutasi Barang</h3>
                                <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-0.5">Transfer Antar Gudang / Vendor</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-white/60 hover:text-white hover:bg-white/15 rounded-xl transition-all">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Product Search */}
                    <div className="relative">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Pilih Produk</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                value={productSearch}
                                onChange={e => { setProductSearch(e.target.value); setShowDropdown(true); setSelectedProduct(null); }}
                                onFocus={() => setShowDropdown(true)}
                                placeholder="Cari nama / SKU / barcode..."
                                className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-violet-500 transition-colors font-medium"
                            />
                        </div>
                        {showDropdown && filteredProducts.length > 0 && !selectedProduct && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 max-h-52 overflow-y-auto">
                                {filteredProducts.map(p => {
                                    const totalStock = (p.stocks || []).reduce((s: number, st: any) => s + Number(st.quantity), 0);
                                    return (
                                        <button key={p.id} type="button"
                                            onClick={() => handleSelectProduct(p)}
                                            className="w-full text-left px-4 py-3 hover:bg-violet-50 transition-colors border-b border-slate-50 last:border-0">
                                            <div className="font-bold text-slate-800 text-sm truncate">{p.name}</div>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <span className="text-[10px] text-slate-400 font-mono">{p.sku}</span>
                                                <span className={`text-[10px] font-black ${totalStock > 0 ? "text-emerald-600" : "text-rose-500"}`}>
                                                    Stok: {totalStock}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {selectedProduct && (
                        <>
                            {/* Transfer Direction */}
                            <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end">
                                {/* From */}
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Dari Gudang / Vendor</label>
                                    <select
                                        value={`${fromWarehouseId}|${fromVendorName}`}
                                        onChange={e => {
                                            const [wId, vName] = e.target.value.split("|");
                                            setFromWarehouseId(wId);
                                            setFromVendorName(vName);
                                            setQuantity("");
                                        }}
                                        className="w-full px-3 py-2.5 text-xs bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-violet-500 font-medium transition-colors"
                                        required
                                    >
                                        <option value="|">-- Pilih Sumber --</option>
                                        {productStocks.map((s: any) => (
                                            <option key={`${s.warehouseId}|${s.vendorName}`} value={`${s.warehouseId}|${s.vendorName}`}>
                                                {s.warehouseName} · {s.vendorName} ({s.quantity})
                                            </option>
                                        ))}
                                    </select>
                                    {fromWarehouseId && (
                                        <p className="text-[10px] text-slate-400 mt-1 font-bold">
                                            Tersedia: <span className={`font-black ${sourceQty > 0 ? "text-emerald-600" : "text-rose-500"}`}>{sourceQty}</span>
                                        </p>
                                    )}
                                </div>

                                {/* Arrow */}
                                <div className="pb-2">
                                    <div className="p-2 bg-violet-100 rounded-xl">
                                        <ArrowRight className="h-4 w-4 text-violet-600" />
                                    </div>
                                </div>

                                {/* To */}
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Ke Gudang</label>
                                    <select
                                        value={toWarehouseId}
                                        onChange={e => setToWarehouseId(e.target.value)}
                                        className="w-full px-3 py-2.5 text-xs bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-violet-500 font-medium transition-colors"
                                        required
                                    >
                                        <option value="">-- Pilih Tujuan --</option>
                                        {warehouses.map((w: any) => (
                                            <option key={w.id} value={w.id}>{w.name}</option>
                                        ))}
                                    </select>
                                    {toWarehouseId && (
                                        <div className="mt-1">
                                            <input
                                                type="text"
                                                value={toVendorName}
                                                onChange={e => setToVendorName(e.target.value)}
                                                placeholder="Vendor tujuan"
                                                className="w-full px-3 py-1.5 text-[10px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500 font-bold"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Preview Transfer */}
                            {fromWarehouseId && toWarehouseId && fromWh && toWh && (
                                <div className="bg-violet-50 border border-violet-100 rounded-2xl p-3 flex items-center gap-3">
                                    <div className="flex-1 text-center">
                                        <p className="text-[9px] font-black text-violet-400 uppercase tracking-wider">Dari</p>
                                        <p className="text-xs font-black text-violet-800">{fromWh.name}</p>
                                        <p className="text-[10px] text-violet-500">{fromVendorName}</p>
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-violet-400 shrink-0" />
                                    <div className="flex-1 text-center">
                                        <p className="text-[9px] font-black text-violet-400 uppercase tracking-wider">Ke</p>
                                        <p className="text-xs font-black text-violet-800">{toWh.name}</p>
                                        <p className="text-[10px] text-violet-500">{toVendorName}</p>
                                    </div>
                                </div>
                            )}

                            {/* Quantity */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Jumlah Mutasi</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min={1}
                                        max={sourceQty}
                                        value={quantity}
                                        onChange={e => setQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                                        placeholder="0"
                                        className="w-full text-xl font-black px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-violet-500 transition-colors"
                                        required
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 uppercase">{selectedProduct.uom}</span>
                                </div>
                                {quantity !== "" && Number(quantity) > sourceQty && (
                                    <p className="text-[10px] text-rose-600 font-black mt-1 flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" /> Melebihi stok tersedia ({sourceQty})
                                    </p>
                                )}
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Keterangan</label>
                                <input
                                    type="text"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Cth: Pindah dari Indogrosir ke Cibinong"
                                    className="w-full px-4 py-2.5 text-sm bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-violet-500 transition-colors font-medium"
                                />
                            </div>
                        </>
                    )}

                    {/* Result feedback */}
                    {result && (
                        <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-bold ${result.success ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
                            {result.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                            {result.message}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={onClose}
                            className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors text-sm"
                            disabled={isLoading}>
                            Batal
                        </button>
                        <button type="submit"
                            disabled={isLoading || !selectedProduct || !fromWarehouseId || !toWarehouseId || !quantity || Number(quantity) <= 0 || Number(quantity) > sourceQty}
                            className="px-8 py-2.5 rounded-xl font-bold text-white bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-200 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:active:scale-100 text-sm">
                            {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" />Memproses...</> : <><ArrowLeftRight className="h-4 w-4" />Proses Mutasi</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
