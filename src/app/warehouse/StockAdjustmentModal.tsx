"use client";

import { useState, useEffect } from "react";
import { X, Save, AlertCircle, Plus, Minus, ArrowRightLeft } from "lucide-react";
import { useSession } from "next-auth/react";
import { callAction } from "@/proxy";

import { cn } from "@/lib/utils";

interface StockAdjustmentModalProps {
    product: any;
    stock: any;
    onClose: () => void;
}

export function StockAdjustmentModal({ product, stock, onClose }: StockAdjustmentModalProps) {
    const { data: session } = useSession() as any;
    const [mode, setMode] = useState<"ADD" | "SUBTRACT" | "SET">("SET");
    const [amount, setAmount] = useState<number | "">("");
    const [notes, setNotes] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (amount === "" || Number(amount) < 0) {
            alert("Masukkan jumlah yang valid.");
            return;
        }

        setIsLoading(true);
        try {
            await callAction("adjustStock", {
                productId: product.id,
                warehouseId: stock.warehouseId,
                vendorName: stock.vendorName,
                type: mode,
                amount: Number(amount),
                notes: notes || `Penyesuaian stok manual (${mode})`,
                adjustedBy: session?.user?.name || "Admin"
            });
            alert("Stok berhasil diperbarui.");
            onClose();
        } catch (error: any) {

            alert(error.message || "Gagal memperbarui stok.");
        } finally {
            setIsLoading(false);
        }
    };

    const currentQty = stock.quantity || 0;
    
    let simulatedResult = currentQty;
    if (amount !== "") {
        if (mode === "ADD") simulatedResult = currentQty + Number(amount);
        if (mode === "SUBTRACT") simulatedResult = currentQty - Number(amount);
        if (mode === "SET") simulatedResult = Number(amount);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center relative">
                    <div className="absolute top-0 left-6 w-12 h-1 bg-primary rounded-b-full" />
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                            <ArrowRightLeft className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 tracking-tight">Penyesuaian Stok</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{product.sku}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-200 hover:shadow-sm">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Item Info */}
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex justify-between items-center">
                        <div className="max-w-[60%]">
                            <p className="font-bold text-slate-800 text-sm truncate">{product.name}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Vendor: {stock.vendorName}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Stok Saat Ini</p>
                            <p className="text-2xl font-black text-slate-900 leading-none">{isClient ? currentQty.toLocaleString() : "..."}</p>
                        </div>
                    </div>

                    {/* Mode Selector */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setMode("SET")}
                            className={cn(
                                "py-2 px-1 text-[10px] font-black uppercase tracking-tighter rounded-lg transition-all",
                                mode === "SET" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Set Akhir
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode("ADD")}
                            className={cn(
                                "py-2 px-1 text-[10px] font-black uppercase tracking-tighter rounded-lg transition-all flex justify-center items-center gap-1",
                                mode === "ADD" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <Plus className="h-3 w-3" /> Tambah
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode("SUBTRACT")}
                            className={cn(
                                "py-2 px-1 text-[10px] font-black uppercase tracking-tighter rounded-lg transition-all flex justify-center items-center gap-1",
                                mode === "SUBTRACT" ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <Minus className="h-3 w-3" /> Kurangi
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 items-center flex justify-between">
                                {mode === "SET" ? "Stok Aktual (Fisik)" : mode === "ADD" ? "Jumlah Tambahan" : "Jumlah Pengurangan"}
                                <span className={cn(
                                    "px-2 rounded-full text-[9px] font-bold py-0.5",
                                    mode === "SET" ? "bg-primary/10 text-primary" : mode === "ADD" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                                )}>
                                    {mode === "SET" ? "HASIL AKHIR" : "SELISIH"}
                                </span>
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="0"
                                    required
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                                    className="w-full text-xl font-black px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-primary transition-colors"
                                    placeholder="0"
                                    disabled={isLoading}
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 uppercase">{product.uom}</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Catatan / Alasan</label>
                            <input
                                type="text"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full text-sm font-medium px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-primary transition-colors"
                                placeholder="Cth: Koreksi stok opname"
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    {/* Preview Result */}
                    {amount !== "" && (
                        <div className={cn(
                            "flex justify-between items-center p-4 rounded-xl border",
                            simulatedResult < 0 ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-100"
                        )}>
                            <div className="flex items-center gap-2">
                                {simulatedResult < 0 ? <AlertCircle className="h-4 w-4 text-red-500" /> : <Save className="h-4 w-4 text-emerald-500" />}
                                <span className={cn(
                                    "text-xs font-bold uppercase tracking-wide",
                                    simulatedResult < 0 ? "text-red-700" : "text-emerald-700"
                                )}>Estimasi Saldo Akhir:</span>
                            </div>
                            <span className={cn(
                                "text-lg font-black",
                                simulatedResult < 0 ? "text-red-700" : "text-emerald-700"
                            )}>
                                {isClient ? simulatedResult.toLocaleString() : "..."}
                            </span>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                            disabled={isLoading}
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || (amount !== "" && simulatedResult < 0)}
                            className="px-8 py-2.5 rounded-xl font-bold text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:active:scale-100"
                        >
                            {isLoading ? "Menyimpan..." : "Simpan Penyesuaian"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
