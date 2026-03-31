"use client";

import { useState } from "react";
import { X, Save, AlertCircle } from "lucide-react";
import { createFinanceTransactionAction } from "@/app/actions";
import { toast } from "react-hot-toast";
import { formatCurrency } from "@/lib/utils";

interface OperationalModalProps {
    isOpen: boolean;
    onClose: () => void;
    coa: any[];
}

export function OperationalModal({ isOpen, onClose, coa }: OperationalModalProps) {
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
    });

    if (!isOpen) return null;

    // Filter COA for Expense and Bank accounts
    const expenseAccounts = coa.filter(a => a.type === "EXPENSE" || a.type === "REVENUE");
    const bankAccounts = coa.filter(a => a.code.startsWith("101") || a.code.startsWith("102"));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.accountId || !formData.bankAccountId || !formData.amount || !formData.description) {
            toast.error("Please fill all required fields");
            return;
        }

        setLoading(true);
        try {
            const res = await createFinanceTransactionAction({
                ...formData,
                amount: parseFloat(formData.amount),
                date: new Date(formData.date),
            });
            if (res.success) {
                toast.success("Transaction recorded");
                onClose();
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tighter">Input Operasional</h2>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Catat Pengeluaran/Pemasukan Baru</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-accent rounded-full transition-colors">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tipe Transaksi</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, transactionType: 'PAYMENT' }))}
                                    className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.transactionType === 'PAYMENT' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-accent text-muted-foreground'}`}
                                >
                                    Pengeluaran
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, transactionType: 'RECEIPT' }))}
                                    className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.transactionType === 'RECEIPT' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-accent text-muted-foreground'}`}
                                >
                                    Pemasukan
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tanggal</label>
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
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Deskripsi Transaksi</label>
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
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Jumlah (Rp)</label>
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
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">No. Referensi (Opsional)</label>
                            <input
                                type="text"
                                placeholder="Ref/ID/Invoice"
                                className="w-full bg-accent/50 border-none rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                                value={formData.referenceNumber}
                                onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Kategori (Chart of Account)</label>
                        <select
                            className="w-full bg-accent/50 border-none rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                            value={formData.accountId}
                            onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                            required
                        >
                            <option value="">Pilih Kategori...</option>
                            {expenseAccounts.map(acc => (
                                <option key={acc.id} value={acc.id}>[{acc.code}] {acc.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Sumber/Tujuan Dana</label>
                        <select
                            className="w-full bg-accent/50 border-none rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                            value={formData.bankAccountId}
                            onChange={(e) => {
                                const acc = bankAccounts.find(a => a.id === e.target.value);
                                setFormData({ ...formData, bankAccountId: e.target.value, bank: acc ? acc.name : "" });
                            }}
                            required
                        >
                            <option value="">Pilih Rekening...</option>
                            {bankAccounts.map(acc => (
                                <option key={acc.id} value={acc.id}>[{acc.code}] {acc.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Sales Context (Opsional)</label>
                        <select
                            className="w-full bg-accent/50 border-none rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                            value={formData.salesPerson}
                            onChange={(e) => setFormData({ ...formData, salesPerson: e.target.value })}
                        >
                            <option value="">Umum / Nonsales</option>
                            <option value="BC">Sales BC</option>
                            <option value="PF">Sales PF</option>
                        </select>
                        <p className="text-[9px] text-muted-foreground ml-1 font-medium mt-1 uppercase italic">
                            *Jika dipilih, transaksi ini akan otomatis memotong Nett Margin Sales.
                        </p>
                    </div>

                    <div className="bg-primary/5 p-4 rounded-2xl flex gap-3 items-start border border-primary/10">
                        <AlertCircle className="w-4 h-4 text-primary mt-0.5" />
                        <p className="text-[10px] font-bold text-muted-foreground leading-relaxed uppercase">
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
                                Simpan Transaksi
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
