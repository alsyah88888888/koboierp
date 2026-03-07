"use client";

import { useState, useEffect, useRef } from "react";
import { Search, CheckCircle, AlertCircle, Barcode, Printer, Package, ChevronRight, X } from "lucide-react";
import { format } from "date-fns";
import { verifyGoodsReceiptAction } from "@/app/actions";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

export function CheckerBoard({ unverifiedReceipts }: { unverifiedReceipts: any[] }) {
    const { data: session } = useSession() as any;
    const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
    const [scanBuffer, setScanBuffer] = useState("");
    const [checkedItems, setCheckedItems] = useState<Record<string, number>>({});
    const [isVerifying, setIsVerifying] = useState(false);
    const scanInputRef = useRef<HTMLInputElement>(null);

    // Auto-focus barcode input
    useEffect(() => {
        if (selectedReceipt && scanInputRef.current) {
            scanInputRef.current.focus();
        }
    }, [selectedReceipt]);

    const handleScan = (barcode: string) => {
        if (!selectedReceipt) return;

        // Find item by barcode or SKU
        const item = selectedReceipt.items.find((i: any) =>
            i.product.barcode === barcode || i.product.sku === barcode
        );

        if (item) {
            setCheckedItems(prev => ({
                ...prev,
                [item.id]: (prev[item.id] || 0) + 1
            }));
            setScanBuffer("");
        } else {
            alert("Barang tidak ditemukan dalam surat jalan ini!");
            setScanBuffer("");
        }
    };

    const handleVerifySubmit = async () => {
        if (!selectedReceipt) return;

        // Check if all items matched
        const allMatched = selectedReceipt.items.every((item: any) =>
            (checkedItems[item.id] || 0) === item.quantity
        );

        if (!allMatched) {
            if (!confirm("Jumlah barang yang di-scan tidak sama dengan surat jalan. Tetap verifikasi?")) return;
        }

        setIsVerifying(true);
        try {
            const res = await verifyGoodsReceiptAction(selectedReceipt.id, session?.user?.name || "Warehouse Admin");
            if (res.success) {
                alert("Penerimaan barang berhasil diverifikasi. Stok telah diperbarui.");
                setSelectedReceipt(null);
                setCheckedItems({});
                window.location.reload(); // Refresh to update list
            }
        } catch (e: any) {
            alert(e.message || "Gagal verifikasi");
        } finally {
            setIsVerifying(false);
        }
    };

    if (selectedReceipt) {
        return (
            <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center relative">
                    <div className="absolute top-0 left-8 w-12 h-1 bg-primary rounded-b-full" />
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                            <Barcode className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Verifikasi Fisik</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                {selectedReceipt.receiptNumber} • {selectedReceipt.warehouse.name}
                            </p>
                        </div>
                    </div>
                    <button onClick={() => setSelectedReceipt(null)} className="p-2.5 hover:bg-white hover:shadow-md rounded-2xl transition-all border border-slate-200 bg-slate-50 text-slate-400 hover:text-red-500 active:scale-95">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    <div className="bg-primary/5 p-6 rounded-[2rem] border-2 border-primary/10 border-dashed flex flex-col md:flex-row gap-6 items-center justify-between">
                        <div className="flex-1">
                            <p className="text-sm font-black text-slate-800">Scan Barcode / SKU</p>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight mt-1">Sistem akan otomatis menghitung jumlah barang yang masuk.</p>
                        </div>
                        <div className="relative w-full md:w-80">
                            <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                            <input
                                ref={scanInputRef}
                                value={scanBuffer}
                                onChange={(e) => setScanBuffer(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleScan(scanBuffer);
                                }}
                                placeholder="Klik disini & Tarik Barcode..."
                                className="w-full pl-12 pr-4 py-3 bg-white border-2 border-primary/20 rounded-2xl focus:border-primary outline-none transition-all font-mono font-bold text-sm shadow-inner"
                            />
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border-2 border-slate-100 bg-white">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-widest border-b-2">
                                <tr>
                                    <th className="px-6 py-4">Nama Barang (SKU)</th>
                                    <th className="px-6 py-4 text-right">Target</th>
                                    <th className="px-6 py-4 text-right">Checked</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {selectedReceipt.items.map((item: any) => {
                                    const scanned = checkedItems[item.id] || 0;
                                    const isComplete = scanned === item.quantity;
                                    return (
                                        <tr key={item.id} className={cn("transition-colors", isComplete ? "bg-emerald-50/30" : "hover:bg-slate-50")}>
                                            <td className="px-6 py-4">
                                                <div className="font-black text-slate-800">{item.product?.name || "Unknown Product"}</div>
                                                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter mt-1">{item.product?.sku || "-"}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-slate-400">
                                                {item.quantity}
                                            </td>
                                            <td className={cn(
                                                "px-6 py-4 text-right font-black text-lg",
                                                scanned === item.quantity ? "text-emerald-600" : scanned > item.quantity ? "text-rose-600" : "text-primary"
                                            )}>
                                                {scanned}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex justify-center">
                                                    {isComplete ? (
                                                        <div className="bg-emerald-100 p-1.5 rounded-full"><CheckCircle className="h-4 w-4 text-emerald-600" /></div>
                                                    ) : (
                                                        <div className="bg-amber-100 p-1.5 rounded-full"><AlertCircle className="h-4 w-4 text-amber-600" /></div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button
                            disabled={isVerifying}
                            onClick={() => setSelectedReceipt(null)}
                            className="px-6 py-2 border rounded-md hover:bg-muted font-bold transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            disabled={isVerifying}
                            onClick={handleVerifySubmit}
                            className={`px-8 py-2 rounded-md font-bold text-white shadow-lg transition-all active:scale-95 flex items-center gap-2 ${isVerifying ? "bg-muted cursor-not-allowed" : "bg-primary hover:bg-primary/90 shadow-primary/20"
                                }`}
                        >
                            {isVerifying ? "Processing..." : "Konfirmasi & Update Stok"}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary font-bold">
                <Package className="h-5 w-5" />
                <h3>Menunggu Verifikasi Checker ({unverifiedReceipts.length})</h3>
            </div>

            {unverifiedReceipts.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed rounded-xl text-muted-foreground italic">
                    Semua barang telah diverifikasi.
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {unverifiedReceipts.map((r) => (
                        <div key={r.id} className="p-4 rounded-xl border bg-card hover:border-primary transition-all group shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-mono text-primary font-bold">{r.receiptNumber}</span>
                                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Pending</span>
                            </div>
                            <p className="text-sm font-bold truncate mb-1">{r.receivedFrom}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-4">
                                <Package className="h-3 w-3" />
                                {r.items.length} Jenis Barang
                            </p>
                            <div className="flex justify-between items-center text-[10px] text-muted-foreground mb-4">
                                <span>{r.createdAt ? format(new Date(r.createdAt), "dd MMM yyyy") : "-"}</span>
                                <span className="uppercase">{r.warehouse?.name || "Unknown"}</span>
                            </div>
                            <button
                                onClick={() => setSelectedReceipt(r)}
                                className="w-full py-2 bg-primary/10 text-primary font-bold rounded-md hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2 group"
                            >
                                Mulai Cek
                                <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
