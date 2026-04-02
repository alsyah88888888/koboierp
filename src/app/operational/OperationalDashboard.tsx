"use client";

import { useState, useEffect } from "react";
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
    initialDeliveries?: any[];
    initialReceipts?: any[];
    userEmail?: string;
}

export function OperationalDashboard({ 
    transactions, 
    coa, 
    initialDeliveries = [], 
    initialReceipts = [],
    userEmail
}: OperationalDashboardProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Calculate Performance for BC & PF
    const getStats = (id: string) => {
        const sales = initialDeliveries.filter((d: any) => d.salesPerson === id);
        const purchases = initialReceipts.filter((r: any) => r.salesPerson === id);
        const expenses = transactions.filter(e => e.salesPerson === id);

        const salesVal = sales.reduce((acc, d) => acc + d.items.reduce((sum: number, i: any) => sum + (i.quantity * Number(i.salesPrice || 0)), 0), 0);
        const purchaseVal = purchases.reduce((acc, r) => acc + r.items.reduce((sum: number, i: any) => sum + (i.quantity * Number(i.purchasePrice || 0)), 0), 0);
        const expenseVal = expenses.reduce((acc, e) => {
            const amt = (e.transactionType === "PAYMENT") ? Number(e.amount) : -Number(e.amount);
            return acc + amt;
        }, 0);

        return {
            salesVal,
            purchaseVal,
            expenseVal,
            margin: (salesVal - purchaseVal) - expenseVal
        };
    };

    const bcStats = getStats("BC");
    const pfStats = getStats("PF");

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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
                <div>
                    <h1 className="text-2xl font-black text-primary uppercase tracking-tighter">Operasional</h1>
                    <p className="text-muted-foreground text-[10px] md:text-xs uppercase font-bold tracking-widest">Manajemen Pengeluaran Operasional</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 w-full sm:w-auto"
                >
                    <Plus className="w-4 h-4" strokeWidth={3} />
                    Input Operasional
                </button>
            </div>

            {/* Nett Margin Cards for Sales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 shadow-sm p-5 rounded-3xl flex justify-between items-center transition-all hover:shadow-md gap-4">
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 shadow-sm px-2 py-0.5 rounded-full bg-white w-fit border border-indigo-50">Sales BC</p>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-2">Nett Margin</p>
                        <p className={`text-2xl font-black tracking-tighter truncate ${bcStats.margin >= 0 ? 'text-indigo-600' : 'text-rose-600'}`} title={isClient ? `Rp ${bcStats.margin.toLocaleString('id-ID')}` : ""}>
                            Rp {isClient ? bcStats.margin.toLocaleString('id-ID') : "---"}
                        </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                        <div className="bg-white px-3 py-1.5 rounded-xl border border-indigo-50 shadow-sm w-full">
                            <p className="text-[9px] font-bold text-emerald-500 uppercase">Total Penjualan</p>
                            <p className="text-xs font-black text-emerald-600 tracking-tighter whitespace-nowrap">Rp {isClient ? bcStats.salesVal.toLocaleString('id-ID') : "---"}</p>
                        </div>
                        <div className="bg-white px-3 py-1.5 rounded-xl border border-indigo-50 shadow-sm w-full">
                            <p className="text-[9px] font-bold text-rose-400 uppercase">Total Pembelian & Ops</p>
                            <p className="text-xs font-black text-rose-500 tracking-tighter whitespace-nowrap">Rp {isClient ? (bcStats.purchaseVal + bcStats.expenseVal).toLocaleString('id-ID') : "---"}</p>
                        </div>
                    </div>
                </div>

                {/* Only show Sales PF if not Bu Cici */}
                {userEmail !== 'cici@kolaborasi.id' && (
                    <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-100 shadow-sm p-5 rounded-3xl flex justify-between items-center transition-all hover:shadow-md gap-4">
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1 shadow-sm px-2 py-0.5 rounded-full bg-white w-fit border border-amber-50">Sales PF</p>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-2">Nett Margin</p>
                            <p className={`text-2xl font-black tracking-tighter truncate ${pfStats.margin >= 0 ? 'text-amber-600' : 'text-rose-600'}`} title={isClient ? `Rp ${pfStats.margin.toLocaleString('id-ID')}` : ""}>
                                Rp {isClient ? pfStats.margin.toLocaleString('id-ID') : "---"}
                            </p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                            <div className="bg-white px-3 py-1.5 rounded-xl border border-amber-50 shadow-sm w-full">
                                <p className="text-[9px] font-bold text-emerald-500 uppercase">Total Penjualan</p>
                                <p className="text-xs font-black text-emerald-600 tracking-tighter whitespace-nowrap">Rp {isClient ? pfStats.salesVal.toLocaleString('id-ID') : "---"}</p>
                            </div>
                            <div className="bg-white px-3 py-1.5 rounded-xl border border-amber-50 shadow-sm w-full">
                                <p className="text-[9px] font-bold text-rose-400 uppercase">Total Pembelian & Ops</p>
                                <p className="text-xs font-black text-rose-500 tracking-tighter whitespace-nowrap">Rp {isClient ? (pfStats.purchaseVal + pfStats.expenseVal).toLocaleString('id-ID') : "---"}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-card border-none shadow-sm p-5 rounded-3xl flex items-center gap-4">
                    <div className="p-3 bg-red-50 text-red-500 rounded-2xl">
                        <ArrowDownCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Pengeluaran</p>
                        <p className="text-xl font-black tracking-tighter">
                            {isClient ? formatCurrency(transactions.filter(t => t.transactionType === "PAYMENT").reduce((sum, t) => sum + Number(t.amount), 0)) : "Rp ---"}
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
                            {isClient ? formatCurrency(transactions.filter(t => t.transactionType === "RECEIPT").reduce((sum, t) => sum + Number(t.amount), 0)) : "Rp ---"}
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
                <div className="p-4 border-b flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
                    <div className="relative w-full md:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Cari transaksi..."
                            className="w-full bg-accent/50 border-none rounded-2xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-wrap gap-2 text-[10px] md:text-xs font-black uppercase tracking-widest justify-center">
                        <button className="px-4 py-1.5 bg-accent rounded-full flex-1 md:flex-none">Semua</button>
                        <button className="px-4 py-1.5 text-muted-foreground hover:bg-accent rounded-full transition-colors flex-1 md:flex-none">Expenses</button>
                        <button className="px-4 py-1.5 text-muted-foreground hover:bg-accent rounded-full transition-colors flex-1 md:flex-none">Income</button>
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left table-fixed min-w-[900px]">
                        <thead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-accent/30 border-b">
                            <tr>
                                <th className="px-6 py-4 w-32">Tanggal</th>
                                <th className="px-6 py-4">Deskripsi</th>
                                <th className="px-6 py-4 w-40">Kategori</th>
                                <th className="px-6 py-4 text-right w-40">Jumlah</th>
                                <th className="px-6 py-4 w-32">Metode</th>
                                <th className="px-6 py-4 text-center w-20">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y text-sm">
                            {filteredTransactions.map((t) => (
                                <tr key={t.id} className="hover:bg-accent/20 transition-colors group">
                                    <td className="px-6 py-4 font-bold text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-3.5 h-3.5 text-primary/40" />
                                            {isClient ? new Date(t.date).toLocaleDateString('id-ID') : "--/--/----"}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-foreground tracking-tight truncate" title={t.description}>{t.description}</div>
                                        {t.referenceNumber && (
                                            <div className="text-[10px] font-black text-muted-foreground uppercase opacity-60 truncate" title={t.referenceNumber}>
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
                                        {isClient ? (t.transactionType === 'PAYMENT' ? '-' : '+') + " " + formatCurrency(Number(t.amount)) : "Rp ---"}
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
