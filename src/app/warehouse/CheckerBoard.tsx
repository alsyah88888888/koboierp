"use client";

import { useState, useEffect, useRef } from "react";
import { Search, CheckCircle2, AlertCircle, Barcode, Printer, Package, ChevronRight, X, AlertTriangle, Camera, CameraOff, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { callAction } from "@/proxy";

import { useSession } from "next-auth/react";
import { cn, formatCurrency } from "@/lib/utils";

export function CheckerBoard({ unverifiedReceipts }: { unverifiedReceipts: any[] }) {
    const { data: session } = useSession() as any;
    const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
    const [scanBuffer, setScanBuffer] = useState("");
    const [checkedItems, setCheckedItems] = useState<Record<string, number>>({});
    const [isVerifying, setIsVerifying] = useState(false);
    const [showDiscrepancyModal, setShowDiscrepancyModal] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [lastScannedId, setLastScannedId] = useState<string | null>(null);
    const scanInputRef = useRef<HTMLInputElement>(null);
    const cameraRef = useRef<any>(null);
    const [globalError, setGlobalError] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);
    const [displaySearchTerm, setDisplaySearchTerm] = useState("");

    const displayReceipts = (unverifiedReceipts || []).filter(r => 
        !r.isVerified && 
        ((r.receiptNumber?.toLowerCase() || "").includes(displaySearchTerm.toLowerCase()) || 
         (r.receivedFrom?.toLowerCase() || "").includes(displaySearchTerm.toLowerCase()))
    );

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Global error listener for hard crashes
    useEffect(() => {
        const handleError = (event: ErrorEvent) => {
            setGlobalError(`Runtime Error: ${event.message}`);
            console.error("Caught global error:", event);
        };
        window.addEventListener("error", handleError);
        return () => window.removeEventListener("error", handleError);
    }, []);

    // Auto-focus barcode input
    useEffect(() => {
        if (selectedReceipt && scanInputRef.current && !showCamera) {
            scanInputRef.current.focus();
        }
    }, [selectedReceipt, showCamera]);

    // Handle Camera Scanner Lifecycle
    useEffect(() => {
        if (showCamera && selectedReceipt) {
            let scanner: any = null;
            const startCamera = async () => {
                try {
                    // Dynamically import to avoid server-side issues
                    const { Html5Qrcode } = await import("html5-qrcode");
                    const html5QrCode = new Html5Qrcode("reader");
                    scanner = html5QrCode;
                    cameraRef.current = html5QrCode;
                    await html5QrCode.start(
                        { facingMode: "environment" },
                        {
                            fps: 10,
                            qrbox: { width: 250, height: 250 }
                        },
                        (decodedText) => {
                            handleScan(decodedText);
                        },
                        () => { } // Error silencer
                    );
                } catch (err) {
                    console.error("Scanner Error:", err);
                    setShowCamera(false);
                }
            };
            startCamera();
            return () => {
                if (scanner && scanner.isScanning) {
                    scanner.stop().catch(() => {});
                }
            };
        }
    }, [showCamera, selectedReceipt]);

    const [scanError, setScanError] = useState<string | null>(null);

    const handleScan = (barcode: string) => {
        if (!selectedReceipt || !barcode) return;
        setScanError(null);

        const cleanBarcode = barcode.trim().toUpperCase();

        // Find item by barcode or SKU
        const item = selectedReceipt?.items?.find((i: any) =>
            (i.product?.barcode && String(i.product.barcode).trim().toUpperCase() === cleanBarcode) ||
            (i.product?.sku && String(i.product.sku).trim().toUpperCase() === cleanBarcode)
        );

        if (item) {
            setCheckedItems(prev => ({
                ...prev,
                [item.id]: (prev[item.id] || 0) + 1
            }));
            setScanBuffer("");
            setLastScannedId(item.id);
            setTimeout(() => setLastScannedId(null), 1000);
        } else {
            setScanError(`Barang "${barcode}" tidak ditemukan di LPB ini`);
            setScanBuffer("");
            try {
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
                oscillator.connect(audioContext.destination);
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.2);
            } catch (e) {}
        }
    };

    const handleVerifySubmit = async () => {
        if (!selectedReceipt) return;

        // Always show modal first for manual verification
        if (!showDiscrepancyModal) {
            setShowDiscrepancyModal(true);
            return;
        }

        setIsVerifying(true);
        try {
            const res = await callAction("verifyGoodsReceipt", selectedReceipt.id, session?.user?.name || "Warehouse Admin", checkedItems);
            if (res.success) {

                // Build summary of what was received
                const lines = selectedReceipt?.items?.map((item: any) => {
                    const actual = checkedItems[item.id] ?? 0;
                    const remaining = item.quantity - actual;
                    return `• ${item.product?.name || 'Unknown'}: Diterima ${actual}/${item.quantity}${remaining > 0 ? ` (sisa ${remaining} belum datang)` : ' ✓'}`;
                }) || [];
                alert(`Verifikasi berhasil! Stok gudang telah diperbarui.\n\nRingkasan:\n${lines.join('\n')}`);
                setSelectedReceipt(null);
                setCheckedItems({});
                window.location.reload();
            }
        } catch (e: any) {
            alert(e.message || "Gagal verifikasi");
        } finally {
            setIsVerifying(false);
        }
    };

    // Safe Render Wrapper to catch rendering-specific crashes
    if (selectedReceipt && isClient) {
        try {
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
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2 flex-wrap">
                                <span>{selectedReceipt?.receiptNumber || "N/A"}</span>
                                {selectedReceipt?.salesPerson && (
                                    <span className={cn(
                                        "text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-widest leading-none",
                                        selectedReceipt.salesPerson === "BC" 
                                            ? "bg-indigo-50 text-indigo-700 border-indigo-100" 
                                            : selectedReceipt.salesPerson === "PF" 
                                            ? "bg-amber-50 text-amber-700 border-amber-100" 
                                            : "bg-slate-50 text-slate-600 border-slate-200"
                                    )}>
                                        {selectedReceipt.salesPerson}
                                    </span>
                                )}
                                <span>• {selectedReceipt?.warehouse?.name || "Unknown Warehouse"}</span>
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
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-black text-slate-800">Scan Barcode / SKU</p>
                                <div className="bg-emerald-500 w-2 h-2 rounded-full animate-pulse" />
                            </div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight mt-1">Gunakan alat scanner atau kamera HP di bawah.</p>
                            <button 
                                onClick={() => {
                                    const allSet: Record<string, number> = {};
                                    selectedReceipt?.items?.forEach((item: any) => { allSet[item.id] = item.quantity; });
                                    setCheckedItems(allSet);
                                }}
                                className="mt-2 px-3 py-1 bg-emerald-50 text-emerald-700 text-[9px] font-black rounded-lg hover:bg-emerald-100 transition-all border border-emerald-100 uppercase tracking-widest"
                            >
                                ✓ Set Semua Sesuai Dokumen
                            </button>
                            {scanError && (
                                <div className="mt-2 text-[10px] font-black text-rose-500 bg-rose-50 px-3 py-1 rounded-lg border border-rose-100 animate-bounce">
                                    ⚠️ {scanError}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                            <button 
                                onClick={() => setShowCamera(!showCamera)}
                                className={cn(
                                    "flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-lg",
                                    showCamera 
                                        ? "bg-rose-500 text-white shadow-rose-200" 
                                        : "bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700"
                                )}
                            >
                                {showCamera ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                                {showCamera ? "Tutup Kamera" : "Scan via Kamera HP"}
                            </button>
                            
                            <div className="relative flex-1 md:w-64">
                                <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                                <input
                                    id="barcode-checker-input"
                                    name="barcodeCheck"
                                    ref={scanInputRef}
                                    value={scanBuffer}
                                    onChange={(e) => setScanBuffer(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleScan(scanBuffer);
                                    }}
                                    placeholder="Input Manual / Scanner..."
                                    className="w-full pl-12 pr-4 py-3 bg-white border-2 border-primary/20 rounded-2xl focus:border-primary outline-none transition-all font-mono font-bold text-sm shadow-inner"
                                />
                            </div>
                        </div>
                    </div>

                    {showCamera && (
                        <div className="relative bg-slate-900 rounded-[2rem] overflow-hidden border-4 border-slate-800 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
                            <div id="reader" className="w-full h-[300px] md:h-[400px]"></div>
                            <div className="absolute inset-x-0 bottom-4 flex justify-center pointer-events-none">
                                <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 flex items-center gap-2">
                                    <Sparkles className="h-3 w-3 text-emerald-400" />
                                    <span className="text-[10px] text-white font-black uppercase tracking-widest">Arahkan ke Barcode Produk</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="overflow-hidden rounded-2xl border-2 border-slate-100 bg-white">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-widest border-b-2">
                                <tr>
                                    <th className="px-6 py-4">Nama Barang (SKU)</th>
                                    <th className="px-6 py-4 text-right">Harga Beli (HPP)</th>
                                    <th className="px-6 py-4 text-right">Target</th>
                                    <th className="px-6 py-4 text-right">Checked</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {(selectedReceipt?.items || []).map((item: any) => {
                                    if (!item || !item.id) return null;
                                    const scanned = checkedItems[item.id] || 0;
                                    const isComplete = scanned === item.quantity;
                                    const isFlashing = lastScannedId === item.id;
                                    return (
                                        <tr
                                            key={item.id}
                                            className={cn(
                                                "transition-all duration-300",
                                                isFlashing ? "bg-emerald-400/20 scale-[1.01] shadow-lg relative z-10" : isComplete ? "bg-emerald-50/30" : "hover:bg-slate-50"
                                            )}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="font-black text-slate-800">{item.product?.name || "Unknown Product"}</div>
                                                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter mt-1">{item.product?.sku || "-"}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-600 text-xs">
                                                {formatCurrency(Number(item.purchasePrice || 0))}
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-slate-400">
                                                {item.quantity}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <label htmlFor={`check-qty-${item.id}`} className="sr-only">Jumlah Barang Terhitung untuk {item.product?.name}</label>
                                                <input
                                                    id={`check-qty-${item.id}`}
                                                    name={`check[${item.id}]`}
                                                    type="number"
                                                    min="0"
                                                    value={scanned}
                                                    onChange={(e) => {
                                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                                        setCheckedItems(prev => ({
                                                            ...prev,
                                                            [item.id]: val
                                                        }));
                                                    }}
                                                    className={cn(
                                                        "w-24 text-right font-black text-lg bg-slate-50 border-2 rounded-xl px-3 py-1 outline-none transition-all focus:border-primary",
                                                        scanned === item.quantity ? "text-emerald-600 border-emerald-100" : scanned > item.quantity ? "text-rose-600 border-rose-100" : "text-primary border-primary/10"
                                                    )}
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex justify-center">
                                                    {isComplete ? (
                                                        <div className="bg-emerald-100 p-1.5 rounded-full"><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div>
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

                {/* Verifikasi Manual Modal */}
                {showDiscrepancyModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-3xl shadow-2xl border-2 border-slate-100 overflow-hidden animate-in zoom-in duration-300 max-h-[90vh] flex flex-col">
                            <div className="p-6 md:p-8 border-b border-slate-100 bg-gradient-to-r from-primary/5 to-blue-50/50 flex items-center gap-4 shrink-0">
                                <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                                    <Package className="h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">Verifikasi Jumlah Barang</h3>
                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">
                                        {selectedReceipt?.receiptNumber || "N/A"} • Koreksi jumlah fisik sebelum konfirmasi
                                    </p>
                                </div>
                                <button onClick={() => setShowDiscrepancyModal(false)} className="p-2.5 hover:bg-white hover:shadow-md rounded-2xl transition-all border border-slate-200 bg-white/50 text-slate-400 hover:text-red-500 active:scale-95">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="p-6 md:p-8 space-y-5 overflow-y-auto flex-1">
                                {/* Quick Action */}
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => {
                                            const allSet: Record<string, number> = {};
                                            selectedReceipt?.items?.forEach((item: any) => { allSet[item.id] = item.quantity; });
                                            setCheckedItems(allSet);
                                        }}
                                        className="px-4 py-2 bg-emerald-50 text-emerald-700 text-xs font-black rounded-xl hover:bg-emerald-100 transition-all active:scale-95 border border-emerald-200"
                                    >
                                        ✓ Set Semua Sesuai
                                    </button>
                                    <button
                                        onClick={() => {
                                            const allZero: Record<string, number> = {};
                                            selectedReceipt?.items?.forEach((item: any) => { allZero[item.id] = 0; });
                                            setCheckedItems(allZero);
                                        }}
                                        className="px-4 py-2 bg-slate-50 text-slate-500 text-xs font-black rounded-xl hover:bg-slate-100 transition-all active:scale-95 border border-slate-200"
                                    >
                                        Reset Semua ke 0
                                    </button>
                                </div>

                                {/* Items List - Editable */}
                                <div className="space-y-3">
                                    {selectedReceipt?.items?.map((item: any, idx: number) => {
                                        const actualQty = checkedItems[item.id] ?? 0;
                                        const diff = actualQty - item.quantity;
                                        const isMatch = diff === 0;
                                        return (
                                            <div key={item.id} className={cn(
                                                "p-4 rounded-2xl border-2 transition-all",
                                                isMatch ? "bg-emerald-50/30 border-emerald-100" : diff < 0 ? "bg-rose-50/30 border-rose-100" : "bg-amber-50/30 border-amber-100"
                                            )}>
                                                <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                                                    {/* Item Info */}
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <div className={cn(
                                                            "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0",
                                                            isMatch ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                                                        )}>
                                                            {isMatch ? "✓" : idx + 1}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-black text-slate-800 text-sm truncate">{item.product?.name || "Unknown"}</div>
                                                            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest flex flex-wrap items-center gap-2 mt-0.5">
                                                                <span>{item.product?.sku || "-"}</span>
                                                                <span className="text-slate-300">•</span>
                                                                <span className="text-primary font-bold">HPP: {formatCurrency(Number(item.purchasePrice || 0))}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Target & Input */}
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <div className="text-center">
                                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dokumen</div>
                                                            <div className="text-lg font-black text-slate-700">{item.quantity}</div>
                                                        </div>

                                                        <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />

                                                        <div className="text-center">
                                                            <label htmlFor={`modal-qty-${item.id}`} className="text-[9px] font-black text-primary uppercase tracking-widest block">Fisik</label>
                                                            <input
                                                                id={`modal-qty-${item.id}`}
                                                                name={`modalQty[${item.id}]`}
                                                                type="number"
                                                                min="0"
                                                                value={actualQty}
                                                                onChange={(e) => {
                                                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                                                    setCheckedItems(prev => ({ ...prev, [item.id]: val }));
                                                                }}
                                                                className={cn(
                                                                    "w-20 text-center font-black text-lg border-2 rounded-xl px-2 py-1.5 outline-none transition-all focus:ring-2 focus:ring-primary/20",
                                                                    isMatch ? "bg-emerald-50 border-emerald-200 text-emerald-700" : diff < 0 ? "bg-rose-50 border-rose-200 text-rose-600" : "bg-amber-50 border-amber-200 text-amber-700"
                                                                )}
                                                            />
                                                        </div>

                                                        {/* Difference Badge */}
                                                        <div className={cn(
                                                            "px-2.5 py-1 rounded-lg text-[10px] font-black min-w-[60px] text-center",
                                                            isMatch ? "bg-emerald-100 text-emerald-700" : diff < 0 ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-700"
                                                        )}>
                                                            {isMatch ? "SESUAI" : diff > 0 ? `+${diff}` : `${diff}`}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Summary */}
                                {(() => {
                                    const totalItems = selectedReceipt?.items?.length || 0;
                                    const matchedItems = selectedReceipt?.items?.filter((item: any) => (checkedItems[item.id] ?? 0) === item.quantity).length || 0;
                                    const hasDiff = matchedItems < totalItems;
                                    return (
                                        <div className={cn(
                                            "p-4 rounded-2xl border flex items-center gap-4",
                                            hasDiff ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"
                                        )}>
                                            {hasDiff ? (
                                                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                                            ) : (
                                                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                                            )}
                                            <div>
                                                <p className={cn("text-xs font-black", hasDiff ? "text-amber-800" : "text-emerald-800")}>
                                                    {matchedItems}/{totalItems} barang sesuai dokumen.
                                                </p>
                                                <p className="text-[10px] text-slate-500 mt-0.5">
                                                    {hasDiff
                                                        ? "Stok akan diperbarui sesuai jumlah fisik yang diinput di atas."
                                                        : "Semua jumlah barang sesuai dengan dokumen."}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Footer Buttons - Fixed at bottom */}
                            <div className="p-6 md:p-8 border-t border-slate-100 bg-slate-50/50 flex gap-3 shrink-0">
                                <button
                                    onClick={() => setShowDiscrepancyModal(false)}
                                    className="flex-1 py-3.5 bg-white text-slate-600 font-black rounded-2xl hover:bg-slate-100 transition-all active:scale-95 text-sm uppercase tracking-widest border-2 border-slate-200"
                                >
                                    Kembali
                                </button>
                                <button
                                    disabled={isVerifying}
                                    onClick={handleVerifySubmit}
                                    className={cn(
                                        "flex-[2] py-3.5 text-white font-black rounded-2xl transition-all active:scale-95 text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-2",
                                        isVerifying ? "bg-slate-400 cursor-not-allowed" : "bg-primary hover:bg-primary/90 shadow-primary/20"
                                    )}
                                >
                                    {isVerifying ? "Memproses..." : "✓ Konfirmasi & Update Stok"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
        } catch (renderError: any) {
            console.error("CheckerBoard Render Error:", renderError);
            return (
                <div className="p-12 bg-white rounded-[2.5rem] border-2 border-rose-100 text-center space-y-4 shadow-xl">
                    <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                        <AlertTriangle className="h-8 w-8" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900">Gagal Memuat Detail Checker</h3>
                        <p className="text-sm text-slate-500 mt-2">Terjadi kesalahan teknis saat merender data LPB ini.</p>
                        <div className="mt-4 p-3 bg-slate-50 rounded-xl text-[10px] font-mono text-rose-600 border border-slate-100 text-left overflow-auto max-h-32">
                            {renderError.message || "Unknown rendering error"}
                        </div>
                    </div>
                    <button 
                        onClick={() => setSelectedReceipt(null)}
                        className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all"
                    >
                        Kembali ke Daftar
                    </button>
                </div>
            );
        }
    }

    if (!isClient) {
        return (
            <div className="p-12 text-center animate-pulse">
                <div className="w-12 h-12 bg-slate-100 rounded-full mx-auto mb-4" />
                <div className="h-4 bg-slate-100 w-48 mx-auto rounded" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {globalError && (
                <div className="bg-rose-600 text-white p-4 rounded-2xl font-black text-xs flex justify-between items-center shadow-xl shadow-rose-200 animate-bounce">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5" />
                        <span>SISTEM CRASH DETECTED: {globalError}</span>
                    </div>
                    <button onClick={() => setGlobalError(null)} className="bg-white/20 px-3 py-1 rounded-lg">Dismiss</button>
                </div>
            )}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                        <Package className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-800 uppercase tracking-tight">Antrian Verifikasi Checker</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest opacity-70">{displayReceipts.length} LPB Menunggu Dicek</p>
                    </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    {session?.user?.role?.toUpperCase() === "ADMIN" && displayReceipts.length > 0 && (
                        <button
                            onClick={async () => {
                                if (confirm(`Apakah Anda yakin ingin memverifikasi SEMUA (${displayReceipts.length}) antrian LPB ini sekaligus?\n\nSistem akan menganggap semua fisik barang SESUAI 100% dan tidak akan menambah stok ganda.`)) {
                                    try {
                                        setIsVerifying(true);
                                        const res = await callAction("bulkVerifyGoodsReceipt", session?.user?.name || "Admin");
                                        if (res.success) {
                                            alert(`Berhasil memverifikasi ${res.count} LPB secara masal!`);
                                            window.location.reload();
                                        }
                                    } catch (err: any) {
                                        alert(err.message || "Gagal verifikasi masal");
                                    } finally {
                                        setIsVerifying(false);
                                    }
                                }
                            }}
                            className="px-4 py-2 bg-emerald-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-emerald-100"
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            Selesaikan Semua Antrian
                        </button>
                    )}
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            value={displaySearchTerm}
                            onChange={e => setDisplaySearchTerm(e.target.value)}
                            placeholder="Cari No. LPB atau Supplier..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm focus:outline-none focus:border-primary focus:bg-white transition-all font-bold placeholder:text-slate-400"
                        />
                    </div>
                </div>
            </div>

            {displayReceipts.length === 0 ? (
                <div className="p-20 text-center border-4 border-dashed border-slate-100 rounded-[3rem] text-slate-300 flex flex-col items-center gap-4">
                    <Sparkles className="h-12 w-12 opacity-20" />
                    <p className="font-black uppercase tracking-widest text-xs">Semua barang sudah diverifikasi atau tidak ditemukan</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {displayReceipts.map((r) => (
                        <div key={r.id} className="p-4 rounded-xl border bg-card hover:border-primary transition-all group shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-primary font-bold">{r.receiptNumber}</span>
                                    {r.salesPerson && (
                                        <span className={cn(
                                            "text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-widest leading-none",
                                            r.salesPerson === "BC" 
                                                ? "bg-indigo-50 text-indigo-700 border-indigo-100" 
                                                : r.salesPerson === "PF" 
                                                ? "bg-amber-50 text-amber-700 border-amber-100" 
                                                : "bg-slate-50 text-slate-600 border-slate-200"
                                        )}>
                                            {r.salesPerson}
                                        </span>
                                    )}
                                </div>
                                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Pending</span>
                            </div>
                            <p className="text-sm font-bold truncate mb-1">{r.receivedFrom}</p>
                            <p className="text-xs text-slate-500 font-bold flex items-center gap-1 mb-4 uppercase tracking-widest">
                                <Package className="h-3 w-3" />
                                {r.items?.length || 0} Jenis Barang
                            </p>
                            <div className="flex justify-between items-center text-[10px] text-slate-400 font-black uppercase mb-4">
                                <span>{r.createdAt ? format(new Date(r.createdAt), "dd MMM yyyy") : "-"}</span>
                                <span className="uppercase">{r.warehouse?.name || "Unknown"}</span>
                            </div>
                            <button
                                onClick={() => {
                                    console.log("Selecting receipt:", r);
                                    setSelectedReceipt(r);
                                }}
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
