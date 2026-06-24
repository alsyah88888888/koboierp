"use client";

import { useState, useMemo } from "react";
import { callAction } from "@/proxy";

import { Plus, Trash2, X, ClipboardList, Calculator } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";

interface RequestItem {
    itemName: string;
    quantity: number | "";
    estimatedPrice: number | "";
}

export function PurchaseRequestModal({ 
    onClose, 
    initialPr 
}: { 
    onClose: () => void,
    initialPr?: any 
}) {
    const isEditing = !!initialPr;
    const [category, setCategory] = useState(initialPr?.category || "PEMBELIAN");
    const [date, setDate] = useState(initialPr?.date ? new Date(initialPr.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    const [salesPerson, setSalesPerson] = useState(initialPr?.salesPerson || "UMUM");
    const [invoiceNumber, setInvoiceNumber] = useState(initialPr?.invoiceNumber || "");
    const [receiptNumber, setReceiptNumber] = useState(initialPr?.receiptNumber || "");
    const [notes, setNotes] = useState(initialPr?.notes || "");
    const [salesRefs, setSalesRefs] = useState<any[]>([]);
    const [purchaseRefs, setPurchaseRefs] = useState<any[]>([]);
    const [isSalesDropdownOpen, setIsSalesDropdownOpen] = useState(false);
    const [isPurchaseDropdownOpen, setIsPurchaseDropdownOpen] = useState(false);
    const [salesSearch, setSalesSearch] = useState("");
    const [purchaseSearch, setPurchaseSearch] = useState("");

    // Fetch refs on mount
    import("react").then(({ useEffect }) => {
        useEffect(() => {
            const loadRefs = async () => {
                try {
                    const sRes = await callAction("getRecentSalesReferences");
                    if (Array.isArray(sRes)) setSalesRefs(sRes);
                    const pRes = await callAction("getRecentPurchaseReferences");
                    if (Array.isArray(pRes)) setPurchaseRefs(pRes);
                } catch (err) {
                    console.error("Error loading refs:", err);
                }
            };
            loadRefs();
        }, []);
    });

    const filteredSalesRefs = salesRefs.filter(r => 
        (r.invoiceNumber || "").toLowerCase().includes(salesSearch.toLowerCase()) || 
        (r.buyerName || "").toLowerCase().includes(salesSearch.toLowerCase())
    ).slice(0, 50);

    const filteredPurchaseRefs = purchaseRefs.filter(r => 
        (r.receiptNumber || "").toLowerCase().includes(purchaseSearch.toLowerCase()) || 
        (r.supplierName || "").toLowerCase().includes(purchaseSearch.toLowerCase())
    ).slice(0, 50);

    const [items, setItems] = useState<RequestItem[]>(
        initialPr?.items?.length > 0 
            ? initialPr.items.map((i: any) => ({
                itemName: i.itemName,
                quantity: i.quantity,
                estimatedPrice: Number(i.estimatedPrice)
            }))
            : [{ itemName: "", quantity: 1, estimatedPrice: 0 }]
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    const addItem = () => setItems([...items, { itemName: "", quantity: 1, estimatedPrice: 0 }]);
    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        if (field === 'quantity') {
            const raw = String(value).replace(/\D/g, "");
            (newItems[index] as any)[field] = raw ? parseInt(raw, 10) : "";
        } else if (field === 'estimatedPrice') {
            const raw = String(value).replace(/\D/g, "");
            (newItems[index] as any)[field] = raw ? parseInt(raw, 10) : "";
        } else {
            (newItems[index] as any)[field] = value;
        }

        setItems(newItems);
    };

    const totalEstimation = useMemo(() => {
        return items.reduce((acc, item) => {
            const q = Number(item.quantity) || 0;
            const p = Number(item.estimatedPrice) || 0;
            return acc + (q * p);
        }, 0);
    }, [items]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const hasEmptyItems = items.some(i => !i.itemName || i.quantity === "" || i.estimatedPrice === "");
        if (hasEmptyItems) {
            alert("Mohon lengkapi nama barang, quantity, dan estimasi harga.");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                date,
                notes,
                category,
                salesPerson,
                invoiceNumber: invoiceNumber || undefined,
                receiptNumber: receiptNumber || undefined,
                items: items.map(i => ({
                    itemName: i.itemName,
                    quantity: Number(i.quantity),
                    estimatedPrice: Number(i.estimatedPrice)
                }))
            };

            const res = isEditing 
                ? await callAction("updatePurchaseRequest", initialPr.id, payload)
                : await callAction("createPurchaseRequest", payload);

            if (res.success) {
                alert(res.message || (isEditing ? "Pengajuan diperbarui." : `Pengajuan berhasil dibuat: ${res.prNumber}`));
                onClose();
            } else {
                alert(res.error || "Gagal memproses pengajuan");
            }
        } catch (error: any) {
            alert(error.message || "Gagal memproses pengajuan");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <ClipboardList className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">PENGAJUAN</h2>
                            <p className="text-xs text-slate-500">Ajukan kebutuhan stok atau operasional ke Admin & Finance.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="h-6 w-6 text-slate-400" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Date Picker */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Tanggal Pengajuan</label>
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold focus:border-primary outline-none transition-all"
                            />
                        </div>

                        {/* Category Selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Tipe Pengajuan</label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setCategory("PEMBELIAN")}
                                    className={cn(
                                        "p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 font-bold",
                                        category === "PEMBELIAN" 
                                            ? "border-primary bg-primary/5 text-primary shadow-sm" 
                                            : "border-slate-100 bg-slate-50 text-slate-400 grayscale"
                                    )}
                                >
                                    📦 Pembelian
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCategory("OPERASIONAL")}
                                    className={cn(
                                        "p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 font-bold",
                                        category === "OPERASIONAL" 
                                            ? "border-indigo-500 bg-indigo-50 text-indigo-600 shadow-sm" 
                                            : "border-slate-100 bg-slate-50 text-slate-400 grayscale"
                                    )}
                                >
                                    🏢 Operasional
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Sales Person Selection for Operasional */}
                    {category === "OPERASIONAL" && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Klasifikasi Operasional</label>
                                <div className="flex flex-wrap gap-3">
                                    {["BC", "PF", "UMUM"].map((sp) => (
                                        <button
                                            key={sp}
                                            type="button"
                                            onClick={() => setSalesPerson(sp)}
                                            className={cn(
                                                "px-6 py-3 rounded-xl border-2 font-black transition-all",
                                                salesPerson === sp
                                                    ? "bg-slate-900 border-slate-900 text-white shadow-lg"
                                                    : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                                            )}
                                        >
                                            {sp}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400">No. Penjualan / Invoice (Opsional)</label>
                                <input
                                    type="text"
                                    placeholder="Cth: KB-TRD-01062026-004"
                                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                                    value={invoiceNumber}
                                    onChange={(e) => setInvoiceNumber(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400">No. LPB / Pembelian (Opsional)</label>
                                <input
                                    type="text"
                                    placeholder="Cth: KB-LPBD-02062026-005"
                                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                                    value={receiptNumber}
                                    onChange={(e) => setReceiptNumber(e.target.value)}
                                />
                            </div>
                            <div className="col-span-full">
                                <p className="text-[10px] font-medium text-emerald-600 bg-emerald-50 p-3 rounded-lg border border-emerald-100 flex items-center gap-2">
                                    <span className="text-sm">💡</span> Jika No. Penjualan atau LPB diisi, maka biaya pengajuan ini akan otomatis memotong margin barang di menu Traceability sebagai biaya "Ops".
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Notes Area */}
                    <div className="space-y-2">
                        <label htmlFor="pr-notes" className="text-xs font-black uppercase tracking-widest text-slate-400 cursor-pointer">Keterangan / Alasan Pengajuan</label>
                        <textarea
                            id="pr-notes"
                            name="notes"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Contoh: Stok barang sisa sedikit, kebutuhan proyek X..."
                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none min-h-[100px]"
                        />
                    </div>

                    {/* Table Area */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Daftar Barang yang Diajukan</label>
                            <button
                                type="button"
                                onClick={addItem}
                                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                            >
                                <Plus className="h-3 w-3" /> Tambah Baris
                            </button>
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block table-responsive border-2 border-slate-100 rounded-xl">
                            <table className="w-full text-sm min-w-[600px]">
                                <thead className="bg-slate-50 border-b-2 border-slate-100 uppercase text-[10px] font-black tracking-widest text-slate-400">
                                    <tr>
                                        <th className="px-4 py-4 text-left">Nama Barang</th>
                                        <th className="px-4 py-4 text-right w-24">Qty</th>
                                        <th className="px-4 py-4 text-right w-40">Estimasi</th>
                                        <th className="px-4 py-4 text-right w-40">Total</th>
                                        <th className="w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {items.map((item, index) => (
                                        <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-2">
                                                <input
                                                    placeholder="Contoh: Kertas A4..."
                                                    className="w-full p-2 bg-transparent border-none focus:ring-0 text-sm font-medium"
                                                    value={item.itemName}
                                                    onChange={e => updateItem(index, 'itemName', e.target.value)}
                                                />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input
                                                    type="text"
                                                    value={item.quantity ? item.quantity.toLocaleString('id-ID') : ""}
                                                    onChange={e => updateItem(index, 'quantity', e.target.value)}
                                                    className="w-full p-2 bg-transparent border-none text-right focus:ring-0 font-mono"
                                                />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input
                                                    type="text"
                                                    value={item.estimatedPrice ? item.estimatedPrice.toLocaleString('id-ID') : ""}
                                                    onChange={e => updateItem(index, 'estimatedPrice', e.target.value)}
                                                    className="w-full p-2 bg-transparent border-none text-right focus:ring-0 font-mono"
                                                />
                                            </td>
                                            <td className="px-4 py-2 text-right font-bold text-slate-700">
                                                {formatCurrency(Number(item.quantity || 0) * Number(item.estimatedPrice || 0))}
                                            </td>
                                            <td className="px-2">
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(index)}
                                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-30"
                                                    disabled={items.length === 1}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden space-y-4">
                            {items.map((item, index) => (
                                <div key={index} className="bg-slate-50 p-4 rounded-xl border-2 border-slate-100 space-y-3 relative group">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Barang</label>
                                        <input
                                            placeholder="Nama barang..."
                                            className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-primary"
                                            value={item.itemName}
                                            onChange={e => updateItem(index, 'itemName', e.target.value)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kuantitas</label>
                                            <input
                                                type="text"
                                                value={item.quantity ? item.quantity.toLocaleString('id-ID') : ""}
                                                onChange={e => updateItem(index, 'quantity', e.target.value)}
                                                className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm font-black outline-none focus:border-primary"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Est. Harga</label>
                                            <input
                                                type="text"
                                                value={item.estimatedPrice ? item.estimatedPrice.toLocaleString('id-ID') : ""}
                                                onChange={e => updateItem(index, 'estimatedPrice', e.target.value)}
                                                className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm font-black outline-none focus:border-primary"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Subtotal</span>
                                        <span className="text-sm font-black text-primary">
                                            {formatCurrency(Number(item.quantity || 0) * Number(item.estimatedPrice || 0))}
                                        </span>
                                    </div>
                                    {items.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            className="absolute -top-2 -right-2 bg-white border-2 border-slate-200 p-2 rounded-full text-rose-300 hover:text-rose-500 shadow-sm"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                </form>

                {/* Footer */}
                <div className="p-6 border-t bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white border-2 border-slate-100 rounded-xl flex items-center gap-3">
                            <Calculator className="h-5 w-5 text-slate-400" />
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">Total Estimasi Pengajuan</p>
                                <p className="text-xl font-black text-primary mt-1">{formatCurrency(totalEstimation)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 md:flex-none px-8 py-3 rounded-xl font-bold bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex-1 md:flex-none px-8 py-3 rounded-xl font-bold bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isSubmitting ? "Mengirim..." : "Kirim Pengajuan"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
