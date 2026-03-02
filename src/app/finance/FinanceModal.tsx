"use client";

import { useState } from "react";
import { X, Loader2, Save, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { createFinanceTransactionAction } from "../actions";

export function FinanceModal({ accounts, onClose }: { accounts: any[], onClose: () => void }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Transaction Details
    const [type, setType] = useState<"PAYMENT" | "RECEIPT" | "MUTATION">("PAYMENT");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [refNo, setRefNo] = useState("");
    const [amount, setAmount] = useState<number>(0);
    const [description, setDescription] = useState("");

    // Account Selection
    const [bankAccountId, setBankAccountId] = useState(""); // Asset/Bank account (Source)
    const [targetAccountId, setTargetAccountId] = useState(""); // Expense/Income OR Destination Bank (if mutation)

    const bankAccounts = accounts.filter(a => a.type === "ASSET");
    const categoryAccounts = type === "MUTATION"
        ? accounts.filter(a => a.type === "ASSET" && a.id !== bankAccountId)
        : accounts.filter(a => a.type !== "ASSET");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !targetAccountId || !bankAccountId) {
            setError("Mohon lengkapi data: Akun Kas, Lawan/Tujuan, dan Nominal.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const result = await createFinanceTransactionAction({
                transactionType: type,
                bank: bankAccounts.find(a => a.id === bankAccountId)?.name || "Kas/Bank",
                date: new Date(date),
                referenceNumber: refNo,
                description,
                amount,
                accountId: targetAccountId,
                bankAccountId: bankAccountId
            });

            if (result.success) {
                onClose();
            }
        } catch (err: any) {
            setError(err.message || "Gagal menyimpan transaksi.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border-2 border-slate-300 shadow-2xl rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b-2 border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Input Transaksi Keuangan</h2>
                        <p className="text-xs text-slate-500 mt-1 font-medium">Catat pembayaran atau penerimaan dana baru.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors border border-slate-200 bg-white"><X className="h-5 w-5 text-slate-600" /></button>
                </div>

                <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-8 space-y-6 bg-white">
                    {/* Toggle Type */}
                    <div className="flex p-1.5 bg-slate-100 rounded-xl border-2 border-slate-200 gap-1 overflow-x-auto">
                        <button
                            type="button"
                            onClick={() => { setType("PAYMENT"); setTargetAccountId(""); }}
                            className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${type === "PAYMENT" ? "bg-white shadow-md text-red-600 border border-slate-200" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            <ArrowUpRight className="h-4 w-4 text-red-600" />
                            <span className="text-red-600">Kas Keluar</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => { setType("RECEIPT"); setTargetAccountId(""); }}
                            className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${type === "RECEIPT" ? "bg-white shadow-md text-emerald-600 border border-slate-200" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            <ArrowDownLeft className="h-4 w-4" /> <span className="text-emerald-600">Kas Masuk</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => { setType("MUTATION"); setTargetAccountId(""); }}
                            className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${type === "MUTATION" ? "bg-white shadow-md text-blue-600 border border-slate-200" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            <span className="text-blue-600 max-w-[10px]">⇄</span> <span className="text-blue-600 ml-2">Mutasi Bank</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                {type === "PAYMENT" ? "1. Sumber Dana (Kas/Bank Keluar)" : type === "RECEIPT" ? "1. Masuk ke Kas/Bank" : "1. Dari Rekening / Kas Asal"}
                            </label>
                            <select
                                value={bankAccountId}
                                onChange={e => { setBankAccountId(e.target.value); if (type === "MUTATION" && targetAccountId === e.target.value) setTargetAccountId(""); }}
                                className="w-full bg-white border-2 border-slate-300 px-3 py-2.5 rounded-lg outline-none focus:border-primary transition-all font-medium"
                                required
                            >
                                <option value="">Pilih Kas/Bank...</option>
                                {bankAccounts.map(a => <option key={a.id} value={a.id}>[{a.code}] {a.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                {type === "PAYMENT" ? "2. Alokasi Biaya / Beban" : type === "RECEIPT" ? "2. Sumber Dana Terim / Pendapatan" : "2. Ke Rekening / Kas Tujuan"}
                            </label>
                            <select
                                value={targetAccountId}
                                onChange={e => setTargetAccountId(e.target.value)}
                                className="w-full bg-white border-2 border-slate-300 px-3 py-2.5 rounded-lg outline-none focus:border-primary transition-all font-medium"
                                required
                            >
                                <option value="">Pilih Akun Tujuan...</option>
                                {categoryAccounts.map(a => <option key={a.id} value={a.id}>[{a.code}] {a.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tanggal Payment</label>
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="w-full bg-white border-2 border-slate-300 px-3 py-2.5 rounded-lg outline-none focus:border-primary transition-all font-medium"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">No. Bukti Transfer / Ref</label>
                            <input
                                value={refNo}
                                onChange={e => setRefNo(e.target.value)}
                                className="w-full bg-white border-2 border-slate-300 px-3 py-2.5 rounded-lg outline-none focus:border-primary transition-all font-medium"
                                placeholder="No. Referensi"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Nominal (Amount)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">Rp</span>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={e => setAmount(parseFloat(e.target.value))}
                                    className="w-full bg-slate-50 border-2 border-slate-300 pl-10 pr-3 py-2.5 rounded-lg outline-none focus:border-primary transition-all font-black text-xl text-primary"
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Catatan/Keterangan</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full bg-white border-2 border-slate-300 px-3 py-2.5 rounded-lg outline-none focus:border-primary transition-all font-medium min-h-[44px]"
                                placeholder="Deskripsi transaksi..."
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-destructive/10 border-2 border-destructive/20 text-destructive text-sm rounded-xl flex items-center gap-2 font-bold">
                            <span className="h-2 w-2 bg-destructive rounded-full" />
                            {error}
                        </div>
                    )}
                </form>

                <div className="p-6 border-t-2 border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-8 py-2.5 border-2 border-slate-300 rounded-xl hover:bg-white font-bold transition-all text-slate-600 shadow-sm"
                    >
                        <span className="text-slate-600">Batal</span>
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-10 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 font-bold shadow-xl shadow-primary/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 border-2 border-primary"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Save className="h-4 w-4 text-white" />}
                        <span className="text-white">Simpan Transaksi</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
