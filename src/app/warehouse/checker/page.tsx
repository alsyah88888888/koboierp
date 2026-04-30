"use client";

import { useState, useEffect, useRef } from "react";
import {
    Barcode,
    CheckCircle2,
    AlertTriangle,
    Search,
    Package,
    ArrowRight,
    Camera
} from "lucide-react";
import { useSession } from "next-auth/react";
import { callAction } from "@/proxy";


export default function WarehouseCheckerPage() {
    const { data: session } = useSession();
    const [receipts, setReceipts] = useState<any[]>([]);
    const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
    const [scanning, setScanning] = useState(false);
    const [barcode, setBarcode] = useState("");
    const [items, setItems] = useState<any[]>([]);
    const [status, setStatus] = useState<string | null>(null);
    const barcodeInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        async function load() {
            const data = await callAction("getGoodsReceipts");
            setReceipts(data.filter((r: any) => !r.isVerified));
        }

        load();
    }, []);

    const handleSelectReceipt = (receipt: any) => {
        setSelectedReceipt(receipt);
        setItems(receipt.items.map((item: any) => ({
            ...item,
            actualQuantity: 0,
            actualPrice: Number(item.purchasePrice),
            notes: ""
        })));
        setScanning(true);
        setTimeout(() => barcodeInputRef.current?.focus(), 100);
    };

    const handleBarcodeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const item = items.find(i => i.product?.barcode === barcode || i.product?.sku === barcode);
        if (item) {
            setItems(items.map(i =>
                (i.product?.barcode === barcode || i.product?.sku === barcode)
                    ? { ...i, actualQuantity: i.actualQuantity + 1 }
                    : i
            ));
            setStatus(`Scanned: ${item.product?.name || 'Unknown'}`);
        } else {
            setStatus("Product not found");
        }
        setBarcode("");
        barcodeInputRef.current?.focus();
    };

    const handleSubmitVerification = async () => {
        if (!selectedReceipt) return;
        try {
            const result = await callAction("submitGoodsReceiptVerification", {
                receiptId: selectedReceipt.id,
                verifiedBy: session?.user?.name || "Warehouse Staff",
                items: items.map(i => ({
                    productId: i.productId,
                    expectedQuantity: i.quantity,
                    actualQuantity: i.actualQuantity,
                    expectedPrice: Number(i.purchasePrice),
                    actualPrice: i.actualPrice,
                    notes: i.notes
                }))
            });


            if (result.success) {
                alert(result.allMatch ? "Verification successful! All items match." : "Verification submitted with discrepancies.");
                setSelectedReceipt(null);
                setItems([]);
                const data = await callAction("getGoodsReceipts");
                setReceipts(data.filter((r: any) => !r.isVerified));

            }
        } catch (e: any) {
            alert(e.message || "Failed to submit verification");
        }
    };

    if (!selectedReceipt) {
        return (
            <div className="max-w-4xl mx-auto space-y-6 p-4">
                <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-2xl">
                        <Barcode className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black">Warehouse Checker</h1>
                        <p className="text-slate-500 font-medium">Scan incoming goods to verify quantity and price.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {receipts.map(r => (
                        <button
                            key={r.id}
                            onClick={() => handleSelectReceipt(r)}
                            className="text-left p-6 bg-white border-2 border-slate-100 rounded-3xl hover:border-primary transition-all group shadow-sm"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black uppercase text-slate-500">
                                    {r.receiptNumber}
                                </span>
                                <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-primary transition-colors" />
                            </div>
                            <h3 className="font-bold text-slate-800">{r.receivedFrom}</h3>
                            <p className="text-xs text-slate-400 mt-1">{r.items.length} Unique Items</p>
                        </button>
                    ))}
                    {receipts.length === 0 && (
                        <div className="col-span-full py-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                            <Package className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-bold">No pending receipts to check</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-4 animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between">
                <button onClick={() => setSelectedReceipt(null)} className="text-sm font-bold text-slate-400 hover:text-slate-600">
                    &larr; Back to List
                </button>
                <div className="text-right">
                    <h2 className="font-black text-slate-900">{selectedReceipt?.receiptNumber || "N/A"}</h2>
                    <p className="text-xs font-bold text-primary truncate max-w-[200px]">{selectedReceipt?.receivedFrom || "-"}</p>
                </div>
            </div>

            <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
                <form onSubmit={handleBarcodeSubmit} className="relative z-10 space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Barcode Scanning Mode</label>
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                            <input
                                ref={barcodeInputRef}
                                value={barcode}
                                onChange={e => setBarcode(e.target.value)}
                                placeholder="Scan or type SKU/Barcode..."
                                className="w-full bg-white/10 border-2 border-white/10 px-12 py-4 rounded-2xl outline-none focus:border-primary/50 font-bold text-white placeholder:text-slate-500"
                            />
                        </div>
                        <button type="submit" className="bg-primary text-white p-4 rounded-2xl shadow-lg shadow-primary/20">
                            <CheckCircle2 className="h-6 w-6" />
                        </button>
                    </div>
                    {status && (
                        <p className={`text-xs font-bold ${status.includes("not found") ? "text-red-400" : "text-green-400"} animate-pulse uppercase tracking-wider`}>
                            {status}
                        </p>
                    )}
                </form>
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-2xl" />
            </div>

            <div className="bg-white border-2 border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                <div className="divide-y divide-slate-50">
                    {items.map((item, idx) => (
                        <div key={idx} className="p-4 flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-slate-800 truncate">{item.product?.name || "Unknown"}</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.product?.sku || "-"}</p>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-center">
                                    <div className="text-[8px] font-black uppercase text-slate-400 mb-1">Expected</div>
                                    <div className="font-black text-slate-400">{item.quantity}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-[8px] font-black uppercase text-slate-500 mb-1">Actual</div>
                                    <div className={`font-black text-xl ${item.actualQuantity === item.quantity ? "text-green-500" : item.actualQuantity > item.quantity ? "text-amber-500" : "text-slate-900"}`}>
                                        {item.actualQuantity}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-lg border-t md:relative md:bg-transparent md:border-none md:p-0">
                <button
                    onClick={handleSubmitVerification}
                    className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-2xl hover:bg-slate-800 transition-all active:scale-95"
                >
                    Submit Verification Result
                </button>
            </div>
            <div className="h-20 md:hidden" />
        </div>
    );
}
