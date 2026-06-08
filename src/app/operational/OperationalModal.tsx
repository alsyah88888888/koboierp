"use client";

import { useState, useEffect } from "react";
import { X, Save, AlertCircle } from "lucide-react";
import { callAction } from "@/proxy";

import { toast } from "react-hot-toast";
import { formatCurrency } from "@/lib/utils";

interface OperationalModalProps {
    isOpen: boolean;
    onClose: () => void;
    coa: any[];
    transaction?: any; // Add for edit mode
}

export function OperationalModal({ isOpen, onClose, coa, transaction }: OperationalModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        transactionType: "PAYMENT" as "PAYMENT" | "RECEIPT",
        bank: "Bank BCA",
        date: new Date().toISOString().split('T')[0],
        referenceNumber: "",
        description: "",
        amount: "",
        accountId: "", // The Expense Account
        bankAccountId: "", // The Bank Account
        salesPerson: "", // Tag to salesperson (BC, PF, etc)
        invoiceNumber: "", // Tautan nomor invoice
        receiptNumber: "", // Tautan nomor LPB
    });
    const [contextType, setContextType] = useState<"GENERAL" | "SALES" | "PURCHASE">("GENERAL");
    const [detectedSale, setDetectedSale] = useState<{
        salesPerson: string;
        invoiceNumber: string;
        buyerName: string;
    } | null>(null);
    const [searchingRef, setSearchingRef] = useState(false);

    const [salesRefs, setSalesRefs] = useState<any[]>([]);
    const [isRefDropdownOpen, setIsRefDropdownOpen] = useState(false);
    const [refSearch, setRefSearch] = useState("");

    useEffect(() => {
        if (!isOpen) return;

        const loadSalesRefs = async () => {
            try {
                const res = await callAction("getRecentSalesReferences");
                if (Array.isArray(res)) {
                    setSalesRefs(res);
                }
            } catch (err) {
                console.error("Error loading sales references:", err);
            }
        };

        loadSalesRefs();
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && transaction) {
            const bankJournal = transaction.journals?.find((j: any) => 
                ["101", "102", "103", "106", "107", "108", "109", "110"].some(prefix => j.account?.code?.startsWith(prefix))
            );
            const categoryJournal = transaction.journals?.find((j: any) => 
                !["101", "102", "103", "106", "107", "108", "109", "110"].some(prefix => j.account?.code?.startsWith(prefix))
            );

            setFormData({
                transactionType: (transaction.transactionType || "PAYMENT") as "PAYMENT" | "RECEIPT",
                bank: transaction.bank || "",
                date: transaction.date ? new Date(transaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                referenceNumber: transaction.referenceNumber || "",
                description: transaction.description || "",
                amount: transaction.amount ? Math.round(Number(transaction.amount)).toString() : "",
                accountId: categoryJournal?.accountId || "",
                bankAccountId: bankJournal?.accountId || "",
                salesPerson: transaction.salesPerson || "",
                invoiceNumber: transaction.invoiceNumber || "",
                receiptNumber: transaction.receiptNumber || "",
            });
            setContextType(transaction.invoiceNumber ? "SALES" : transaction.receiptNumber ? "PURCHASE" : "GENERAL");
        } else if (isOpen) {
            setFormData({
                transactionType: "PAYMENT",
                bank: "Bank BCA",
                date: new Date().toISOString().split('T')[0],
                referenceNumber: "",
                description: "",
                amount: "",
                accountId: "",
                bankAccountId: "",
                salesPerson: "",
                invoiceNumber: "",
                receiptNumber: "",
            });
            setContextType("GENERAL");
        }
    }, [transaction, isOpen]);

    useEffect(() => {
        if (!formData.referenceNumber) {
            setDetectedSale(null);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setSearchingRef(true);
            try {
                const res = await callAction("lookupSalesReference", formData.referenceNumber);
                if (res && res.success) {
                    setDetectedSale({
                        salesPerson: res.salesPerson || "",
                        invoiceNumber: res.invoiceNumber || "",
                        buyerName: res.buyerName || ""
                    });
                    setContextType("SALES");
                    setFormData(prev => ({
                        ...prev,
                        salesPerson: res.salesPerson || "",
                        invoiceNumber: res.invoiceNumber || ""
                    }));
                } else {
                    setDetectedSale(null);
                }
            } catch (err) {
                console.error("Error looking up reference:", err);
                setDetectedSale(null);
            } finally {
                setSearchingRef(false);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [formData.referenceNumber]);

    if (!isOpen) return null;

    // Filter COA for Expense and Bank accounts
    const expenseAccounts = Array.isArray(coa) ? coa.filter(a => a.type === "EXPENSE" || a.type === "REVENUE") : [];
    const bankAccounts = Array.isArray(coa) ? coa.filter(a => 
        a.type === "ASSET" && 
        ["101", "102", "103", "106", "107", "108", "109", "110"].some(prefix => a.code.startsWith(prefix))
    ).sort((a, b) => a.code.localeCompare(b.code)) : [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.accountId || !formData.bankAccountId || !formData.amount || !formData.description) {
            toast.error("Please fill all required fields");
            return;
        }

        setLoading(true);
        try {
            let res;
            if (transaction?.id) {
                res = await callAction("updateFinanceTransaction", transaction.id, {
                    ...formData,
                    amount: parseFloat(formData.amount),
                    date: new Date(formData.date),
                });
            } else {
                res = await callAction("createFinanceTransaction", {
                    ...formData,
                    amount: parseFloat(formData.amount),
                    date: new Date(formData.date),
                });
            }

            if (res.success) {
                toast.success(transaction?.id ? "Transaction updated" : "Transaction recorded");
                onClose();
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredRefs = salesRefs.filter(ref => {
        const term = refSearch.toLowerCase();
        return (
            ref.invoiceNumber.toLowerCase().includes(term) ||
            (ref.buyerName || "").toLowerCase().includes(term) ||
            (ref.salesPerson || "").toLowerCase().includes(term)
        );
    });

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tighter">
                            {transaction?.id ? "Edit Transaksi" : "Input Operasional"}
                        </h2>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                            {transaction?.id ? "Ubah Data Transaksi Operasional" : "Catat Pengeluaran/Pemasukan Baru"}
                        </p>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">
                            {transaction?.id ? "Edit Financial Record" : "Financial Record"}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-all text-slate-400 group">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="flex gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Tipe Transaksi</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, transactionType: 'PAYMENT' })}
                                    className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.transactionType === 'PAYMENT' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-accent text-slate-500'}`}
                                >
                                    Pengeluaran
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, transactionType: 'RECEIPT' })}
                                    className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.transactionType === 'RECEIPT' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-accent text-slate-500'}`}
                                >
                                    Pemasukan
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Tanggal</label>
                            <input
                                type="date"
                                className="w-full bg-accent/50 border-none rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Deskripsi Transaksi</label>
                        <input
                            type="text"
                            placeholder="Contoh: Bayar Listrik, ATK, Kebersihan..."
                            className="w-full bg-accent/50 border-none rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Jumlah (Rp)</label>
                            <input
                                type="text"
                                placeholder="0"
                                className="w-full bg-accent/50 border-none rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                                value={formData.amount ? Number(formData.amount).toLocaleString('id-ID') : ""}
                                onChange={(e) => {
                                    const raw = e.target.value.replace(/\D/g, "");
                                    setFormData({ ...formData, amount: raw ? parseInt(raw, 10).toString() : "" });
                                }}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">No. Referensi (Opsional)</label>
                            <input
                                type="text"
                                placeholder="Ref/ID/Invoice"
                                className="w-full bg-accent/50 border-none rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                                value={formData.referenceNumber}
                                onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                            />
                            {searchingRef && (
                                <p className="text-[10px] text-slate-400 italic animate-pulse ml-1">Mencari referensi penjualan...</p>
                            )}
                            {detectedSale && (
                                <div className="mt-1 p-2 bg-emerald-50 border border-emerald-100 rounded-xl flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <p className="text-[10px] text-emerald-700 font-black uppercase tracking-wider">
                                        ✓ Referensi Penjualan Terdeteksi
                                    </p>
                                    <p className="text-[9px] text-emerald-600 font-bold leading-normal">
                                        Sales: {detectedSale.salesPerson} | Invoice: {detectedSale.invoiceNumber} <br />
                                        Buyer: {detectedSale.buyerName}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Kategori (Chart of Account)</label>
                        <select
                            className="w-full bg-accent/50 border-none rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                            value={formData.accountId}
                            onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                            required
                        >
                            <option value="">Pilih Kategori...</option>
                            {Array.isArray(expenseAccounts) && expenseAccounts.map(acc => (
                                <option key={acc.id} value={acc.id}>[{acc.code}] {acc.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Sumber/Tujuan Dana</label>
                        <select
                            className="w-full bg-accent/50 border-none rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                            value={formData.bankAccountId}
                            onChange={(e) => {
                                const acc = bankAccounts.find(a => a.id === e.target.value);
                                setFormData({ ...formData, bankAccountId: e.target.value, bank: acc ? acc.name : "" });
                            }}
                            required
                        >
                            <option value="">-- PILIH REKENING / KAS --</option>
                            {Array.isArray(bankAccounts) && bankAccounts.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.name.toUpperCase()} ({acc.code})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Konteks Transaksi</label>
                        <select
                            className="w-full bg-accent/50 border-none rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                            value={contextType}
                            onChange={(e) => {
                                const type = e.target.value as "GENERAL" | "SALES" | "PURCHASE";
                                setContextType(type);
                                setFormData(prev => ({
                                    ...prev,
                                    salesPerson: type === "SALES" ? prev.salesPerson : "",
                                    invoiceNumber: type === "SALES" ? prev.invoiceNumber : "",
                                    receiptNumber: type === "PURCHASE" ? prev.receiptNumber : ""
                                }));
                            }}
                        >
                            <option value="GENERAL">Umum / Non-Transaksi</option>
                            <option value="SALES">Penjualan (Sales)</option>
                            <option value="PURCHASE">Pembelian (Purchase/Landed Cost)</option>
                        </select>
                    </div>

                    {contextType === "SALES" && (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Sales Context (Opsional)</label>
                                <select
                                    className="w-full bg-accent/50 border-none rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                                    value={formData.salesPerson}
                                    onChange={(e) => setFormData({ ...formData, salesPerson: e.target.value })}
                                >
                                    <option value="">Pilih Sales...</option>
                                    <option value="BC">Sales BC</option>
                                    <option value="PF">Sales PF</option>
                                </select>
                            </div>
                            <div className="space-y-2 relative">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">No. Invoice / SJ</label>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setIsRefDropdownOpen(!isRefDropdownOpen)}
                                        className="w-full text-left bg-accent/50 border-none rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all flex justify-between items-center cursor-pointer min-h-[38px]"
                                    >
                                        <span className="truncate">
                                            {formData.invoiceNumber || "Pilih Invoice / SJ..."}
                                        </span>
                                        <span className="text-[8px] text-slate-400">▼</span>
                                    </button>

                                    {isRefDropdownOpen && (
                                        <>
                                            <div 
                                                className="fixed inset-0 z-40 cursor-default" 
                                                onClick={() => setIsRefDropdownOpen(false)}
                                            />
                                            <div className="absolute right-0 left-0 mt-1 bg-card border border-slate-200 shadow-2xl rounded-2xl p-2 z-50 max-h-60 overflow-y-auto space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                                                <input
                                                    type="text"
                                                    placeholder="Cari Invoice/SJ..."
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-lg py-1.5 px-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                    value={refSearch}
                                                    onChange={(e) => setRefSearch(e.target.value)}
                                                    onClick={(e) => e.stopPropagation()} // prevent closing
                                                />
                                                <div className="space-y-1 max-h-48 overflow-y-auto">
                                                    {filteredRefs.length === 0 ? (
                                                        <div className="p-3 text-[10px] font-bold text-slate-400 text-center uppercase tracking-wider">
                                                            Data tidak ditemukan
                                                        </div>
                                                    ) : (
                                                        filteredRefs.map((ref) => (
                                                            <button
                                                                key={ref.invoiceNumber}
                                                                type="button"
                                                                onClick={() => {
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        invoiceNumber: ref.invoiceNumber,
                                                                        salesPerson: ref.salesPerson || prev.salesPerson,
                                                                        referenceNumber: ref.invoiceNumber
                                                                    }));
                                                                    setIsRefDropdownOpen(false);
                                                                    setRefSearch("");
                                                                }}
                                                                className="w-full text-left p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer flex flex-col gap-0.5"
                                                            >
                                                                <span className="text-xs font-bold text-slate-800 tracking-tight">
                                                                    {ref.invoiceNumber}
                                                                </span>
                                                                <span className="text-[10px] font-medium text-slate-500 leading-none">
                                                                    {ref.buyerName || "No Customer"} • Sales: {ref.salesPerson || "No Sales"} • Rp {ref.grandTotal.toLocaleString("id-ID")}
                                                                </span>
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {contextType === "PURCHASE" && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">No. LPB / Penerimaan Barang</label>
                            <input
                                type="text"
                                placeholder="Contoh: LPB-BC-02062026-001"
                                className="w-full bg-accent/50 border-none rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                                value={formData.receiptNumber}
                                onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
                                required
                            />
                        </div>
                    )}
                    
                    <div className="px-2">
                        <p className="text-[9px] text-slate-400 ml-1 font-medium mt-1 uppercase italic">
                            {contextType === "SALES" && "*Jika dipilih, transaksi ini akan otomatis memotong Nett Margin Sales."}
                            {contextType === "PURCHASE" && "*Jika dipilih, transaksi ini akan otomatis menambah Landed Cost / HPP barang masuk."}
                            {contextType === "GENERAL" && "*Transaksi operasional umum (tidak menempel ke penjualan/pembelian)."}
                        </p>
                    </div>

                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                        <p className="text-[10px] font-bold text-slate-600 leading-relaxed uppercase">
                            Transaksi ini akan otomatis memotong/menambah saldo rekening yang dipilih dan mencatat jurnal akuntansi yang sesuai.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-primary-foreground py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 mt-4"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                {transaction?.id ? "Simpan Perubahan" : "Simpan Transaksi"}
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
