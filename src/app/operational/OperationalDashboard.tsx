"use client";

import { useState } from "react";
import {
    Plus,
    Search,
    ArrowUpCircle,
    ArrowDownCircle,
    MoreVertical,
    Calendar,
    Receipt,
    Wallet
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { OperationalModal } from "./OperationalModal";
import { toast } from "react-hot-toast";
import { deleteFinanceTransactionAction } from "@/app/actions";

interface OperationalDashboardProps {
    transactions: any[];
    coa: any[];
}

export function OperationalDashboard({ transactions, coa }: OperationalDashboardProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);

    const filteredTransactions = transactions.filter(t =>
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this transaction?")) return;
        try {
            const res = await deleteFinanceTransactionAction(id);
            if (res.success) {
                toast.success("Transaction deleted");
            }
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    return (
        <div className="space-y-6 flex-1 h-full overflow-hidden flex flex-col">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-primary uppercase tracking-tighter">Operasional</h1>
                    <p className="text-muted-foreground text-xs uppercase font-bold tracking-widest">Manajemen Pengeluaran Operasional</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                >
                    <Plus className="w-4 h-4" strokeWidth={3} />
                    Input Operasional
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-card border-none shadow-sm p-5 rounded-3xl flex items-center gap-4">
                    <div className="p-3 bg-red-50 text-red-500 rounded-2xl">
                        <ArrowDownCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Pengeluaran</p>
                        <p className="text-xl font-black tracking-tighter">
                            {formatCurrency(transactions.filter(t => t.transactionType === "PAYMENT").reduce((sum, t) => sum + Number(t.amount), 0))}
                        </p>
                    </div>
                </div>
                <div className="bg-card border-none shadow-sm p-5 rounded-3xl flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl">
                        <ArrowUpCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Pemasukan</p>
                        <p className="text-xl font-black tracking-tighter">
                            {formatCurrency(transactions.filter(t => t.transactionType === "RECEIPT").reduce((sum, t) => sum + Number(t.amount), 0))}
                        </p>
                    </div>
                </div>
                <div className="bg-card border-none shadow-sm p-5 rounded-3xl flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl">
                        <Receipt className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Banyak Transaksi</p>
                        <p className="text-xl font-black tracking-tighter">{transactions.length}</p>
                    </div>
                </div>
            </div>

            <div className="bg-card border-none shadow-sm rounded-3xl overflow-hidden flex flex-col flex-1">
                <div className="p-4 border-b flex justify-between items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Cari transaksi..."
                            className="w-full bg-accent/50 border-none rounded-2xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 text-xs font-black uppercase tracking-widest">
                        <button className="px-3 py-1 bg-accent rounded-full">Semua</button>
                        <button className="px-3 py-1 text-muted-foreground hover:bg-accent rounded-full transition-colors">Expenses</button>
                        <button className="px-3 py-1 text-muted-foreground hover:bg-accent rounded-full transition-colors">Income</button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-accent/30 border-b">
                            <tr>
                                <th className="px-6 py-4">Tanggal</th>
                                <th className="px-6 py-4">Deskripsi</th>
                                <th className="px-6 py-4">Kategori</th>
                                <th className="px-6 py-4 text-right">Jumlah</th>
                                <th className="px-6 py-4">Metode</th>
                                <th className="px-6 py-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y text-sm">
                            {filteredTransactions.map((t) => (
                                <tr key={t.id} className="hover:bg-accent/20 transition-colors group">
                                    <td className="px-6 py-4 font-bold text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-3.5 h-3.5 text-primary/40" />
                                            {new Date(t.date).toLocaleDateString('id-ID')}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-foreground tracking-tight">{t.description}</div>
                                        {t.referenceNumber && (
                                            <div className="text-[10px] font-black text-muted-foreground uppercase opacity-60">
                                                Ref: {t.referenceNumber}
                                            </div>
                                        )}
                                        {t.salesPerson && (
                                            <div className="mt-1">
                                                <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-500 rounded text-[9px] font-black uppercase tracking-widest border border-indigo-100">
                                                    Sales: {t.salesPerson}
                                                </span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-accent rounded-lg text-[10px] font-black uppercase tracking-tighter">
                                            {t.journals?.[0]?.account?.name || "Uncategorized"}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 text-right font-black tracking-tighter ${t.transactionType === 'PAYMENT' ? 'text-red-500' : 'text-emerald-500'}`}>
                                        {t.transactionType === 'PAYMENT' ? '-' : '+'} {formatCurrency(Number(t.amount))}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-xs uppercase opacity-70">
                                        <div className="flex items-center gap-2">
                                            <Wallet className="w-3 h-3" />
                                            {t.bank}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => handleDelete(t.id)}
                                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <MoreVertical className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2 opacity-20 capitalize">
                                            <Receipt className="w-12 h-12" />
                                            <p className="font-black text-xl tracking-tighter">Belum ada transaksi</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <OperationalModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                coa={coa}
            />
        </div>
    );
}
