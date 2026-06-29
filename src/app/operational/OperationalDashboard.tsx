"use client";

import { useState, useEffect } from "react";
import {
    Plus,
    Search,
    ArrowUpCircle,
    ArrowDownCircle,
    Pencil,
    Trash2,
    Calendar,
    Receipt,
    Wallet,
    TrendingUp,
    Download
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { exportToExcel } from "@/lib/excel";
import { format } from "date-fns";
import { OperationalModal } from "./OperationalModal";
import { toast } from "react-hot-toast";
import { callAction } from "@/proxy";


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
    const [editingTransaction, setEditingTransaction] = useState<any | null>(null);
    const [isClient, setIsClient] = useState(false);
    const [filterType, setFilterType] = useState<"ALL"|"INCOME"|"EXPENSE">("ALL");
    const [filterMonth, setFilterMonth] = useState<string>("ALL");
    const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
    const [filterDate, setFilterDate] = useState<string>("");

    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

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

    const filteredTransactions = transactions.filter(t => {
        const matchSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase());
        
        let matchType = true;
        if (filterType === "INCOME") matchType = t.transactionType === "RECEIPT";
        if (filterType === "EXPENSE") matchType = t.transactionType === "PAYMENT";

        let matchDate = true;
        if (filterDate) {
            matchDate = t.date.split('T')[0] === filterDate;
        } else {
            const txDate = new Date(t.date);
            const txYear = txDate.getFullYear().toString();
            const txMonth = (txDate.getMonth() + 1).toString();
            
            const matchYear = filterYear === "ALL" || txYear === filterYear;
            const matchMonth = filterMonth === "ALL" || txMonth === filterMonth;
            
            matchDate = matchYear && matchMonth;
        }

        return matchSearch && matchType && matchDate;
    });

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this transaction?")) return;
        try {
            const res = await callAction("deleteFinanceTransaction", id);

            if (res.success) {
                toast.success("Transaction deleted");
            }
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleExport = () => {
        const data: any[] = filteredTransactions.map(t => ({
            'Tanggal': format(new Date(t.date), "dd/MM/yyyy"),
            'Kategori': t.category || 'N/A',
            'Keterangan': t.description,
            'Referensi': t.referenceNumber || '-',
            'Metode': t.bank,
            'PIC': t.salesPerson || '-',
            'Tipe': t.transactionType,
            'Jumlah': Number(t.amount)
        }));

        // Summary Data (BC & PF Performance)
        data.push({}); // Empty line
        data.push({ 'Keterangan': '--- RINGKASAN PERFORMA ---' });
        data.push({ 'Keterangan': 'PERFORMA BC', 'Jumlah': bcStats.margin });
        data.push({ 'Keterangan': 'PERFORMA PF', 'Jumlah': pfStats.margin });

        exportToExcel(data, 'Laporan_Hasil_Operasional', 'Operasional');
    };

    return (
        <div className="space-y-6 flex-1 h-full overflow-hidden flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
                <div>
                    <h1 className="text-2xl font-black text-primary uppercase tracking-tighter">Hasil Operasional</h1>
                    <p className="text-muted-foreground text-[10px] md:text-xs uppercase font-bold tracking-widest text-emerald-600">Akumulasi Realisasi Kegiatan (Terbayar)</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex-1 sm:flex-none bg-primary text-white px-6 py-2 rounded-full flex items-center justify-center gap-2 hover:bg-slate-800 shadow-lg shadow-primary/20 transition-all active:scale-95 font-black uppercase text-[10px] tracking-widest"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Input Operasional</span>
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex-1 sm:flex-none bg-emerald-600 text-white px-6 py-2 rounded-full flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95 font-black uppercase text-[10px] tracking-widest"
                    >
                        <Download className="h-4 w-4" />
                        <span>Excel</span>
                    </button>
                </div>
            </div>

            {/* Nett Margin Cards for Sales */}
            {/* Nett Margin Cards for Sales */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-[1400px]">
                <div className="erp-card p-6 md:p-8 relative overflow-hidden group">
                    <div className="absolute -right-12 -top-12 h-48 w-48 bg-indigo-50 rounded-full blur-3xl transition-transform group-hover:scale-110 opacity-60" />
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                                <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-100">
                                    <TrendingUp className="h-5 w-5" />
                                </div>
                                <div className="space-y-0.5">
                                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Performance: BC</h3>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-full inline-block">Sales Channel</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-5 bg-white border border-slate-100 rounded-3xl shadow-sm space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nett Margin</p>
                                <p className={`text-2xl font-black tracking-tighter ${bcStats.margin >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                                    {formatCurrency(bcStats.margin)}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex justify-between items-center">
                                    <span className="text-[9px] font-bold text-emerald-600 uppercase">Sales</span>
                                    <span className="text-xs font-black text-emerald-700">{formatCurrency(bcStats.salesVal)}</span>
                                </div>
                                <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-2xl flex justify-between items-center">
                                    <span className="text-[9px] font-bold text-rose-600 uppercase">Ops/Purchase</span>
                                    <span className="text-xs font-black text-rose-700">{formatCurrency(bcStats.purchaseVal + bcStats.expenseVal)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Only show Sales PF if not Bu Cici */}
                {userEmail !== 'chici@kolaborasi.id' && (
                    <div className="erp-card p-6 md:p-8 relative overflow-hidden group">
                        <div className="absolute -right-12 -top-12 h-48 w-48 bg-amber-50 rounded-full blur-3xl transition-transform group-hover:scale-110 opacity-60" />
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="bg-amber-600 text-white p-3 rounded-2xl shadow-lg shadow-amber-100">
                                        <Wallet className="h-5 w-5" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <h3 className="text-lg font-black text-slate-900 tracking-tight">Performance: PF</h3>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-amber-400 bg-amber-50 px-2 py-0.5 rounded-full inline-block">Direct Channel</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-5 bg-white border border-slate-100 rounded-3xl shadow-sm space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nett Margin</p>
                                    <p className={`text-2xl font-black tracking-tighter ${pfStats.margin >= 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                                        {formatCurrency(pfStats.margin)}
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex justify-between items-center">
                                        <span className="text-[9px] font-bold text-emerald-600 uppercase">Sales</span>
                                        <span className="text-xs font-black text-emerald-700">{formatCurrency(pfStats.salesVal)}</span>
                                    </div>
                                    <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-2xl flex justify-between items-center">
                                        <span className="text-[9px] font-bold text-rose-600 uppercase">Ops/Purchase</span>
                                        <span className="text-xs font-black text-rose-700">{formatCurrency(pfStats.purchaseVal + pfStats.expenseVal)}</span>
                                    </div>
                                </div>
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
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Pengeluaran</p>
                        <p className="text-xl font-black tracking-tighter text-slate-900">
                            {isClient ? formatCurrency(transactions.filter(t => t.transactionType === "PAYMENT").reduce((sum, t) => sum + Number(t.amount), 0)) : "Rp ---"}
                        </p>
                    </div>
                </div>
                <div className="bg-card border-none shadow-sm p-5 rounded-3xl flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl">
                        <ArrowUpCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Pemasukan</p>
                        <p className="text-xl font-black tracking-tighter text-slate-900">
                            {isClient ? formatCurrency(transactions.filter(t => t.transactionType === "RECEIPT").reduce((sum, t) => sum + Number(t.amount), 0)) : "Rp ---"}
                        </p>
                    </div>
                </div>
                <div className="bg-card border-none shadow-sm p-5 rounded-3xl flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl">
                        <Receipt className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Banyak Transaksi</p>
                        <p className="text-xl font-black tracking-tighter text-slate-900">{transactions.length}</p>
                    </div>
                </div>
            </div>

            <div className="bg-card border-none shadow-sm rounded-3xl overflow-hidden flex flex-col flex-1">
                <div className="p-4 border-b flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4">
                    <div className="flex flex-col md:flex-row gap-4 w-full xl:max-w-3xl">
                        <div className="relative w-full md:w-64 shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Cari transaksi..."
                                className="w-full bg-accent/50 border-none rounded-2xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Date Filters */}
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                type="date"
                                className="bg-accent/50 border-none rounded-2xl py-2 px-4 text-[10px] font-black uppercase tracking-widest text-slate-600 focus:ring-2 focus:ring-primary/20 transition-all outline-none h-[36px]"
                                value={filterDate}
                                onChange={(e) => {
                                    setFilterDate(e.target.value);
                                    if (e.target.value) {
                                        setFilterMonth("ALL");
                                        setFilterYear("ALL");
                                    }
                                }}
                            />
                            {!filterDate && (
                                <>
                                    <select
                                        value={filterMonth}
                                        onChange={(e) => setFilterMonth(e.target.value)}
                                        className="bg-accent/50 border-none rounded-2xl py-2 pl-4 pr-8 text-[10px] font-black uppercase tracking-widest text-slate-600 focus:ring-2 focus:ring-primary/20 transition-all outline-none cursor-pointer h-[36px]"
                                    >
                                        <option value="ALL">Semua Bulan</option>
                                        {months.map((m, i) => (
                                            <option key={i} value={(i + 1).toString()}>{m}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={filterYear}
                                        onChange={(e) => setFilterYear(e.target.value)}
                                        className="bg-accent/50 border-none rounded-2xl py-2 pl-4 pr-8 text-[10px] font-black uppercase tracking-widest text-slate-600 focus:ring-2 focus:ring-primary/20 transition-all outline-none cursor-pointer h-[36px]"
                                    >
                                        <option value="ALL">Semua Tahun</option>
                                        {years.map(y => (
                                            <option key={y} value={y.toString()}>{y}</option>
                                        ))}
                                    </select>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[10px] md:text-xs font-black uppercase tracking-widest justify-center shrink-0">
                        <button 
                            className={`px-4 py-1.5 rounded-full flex-1 md:flex-none transition-colors ${filterType === "ALL" ? 'bg-accent text-slate-900' : 'text-muted-foreground hover:bg-accent/50'}`}
                            onClick={() => setFilterType("ALL")}
                        >Semua</button>
                        <button 
                            className={`px-4 py-1.5 rounded-full flex-1 md:flex-none transition-colors ${filterType === "EXPENSE" ? 'bg-accent text-slate-900' : 'text-muted-foreground hover:bg-accent/50'}`}
                            onClick={() => setFilterType("EXPENSE")}
                        >Expenses</button>
                        <button 
                            className={`px-4 py-1.5 rounded-full flex-1 md:flex-none transition-colors ${filterType === "INCOME" ? 'bg-accent text-slate-900' : 'text-muted-foreground hover:bg-accent/50'}`}
                            onClick={() => setFilterType("INCOME")}
                        >Income</button>
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left table-fixed min-w-[900px]">
                        <thead className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-accent/30 border-b">
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
                                    <td className="px-6 py-4 font-bold text-slate-500">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-3.5 h-3.5 text-primary/40" />
                                            {isClient ? new Date(t.date).toLocaleDateString('id-ID') : "--/--/----"}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900 tracking-tight truncate" title={t.description}>{t.description}</div>
                                        {t.referenceNumber && (
                                            <div className="text-[10px] font-black text-slate-400 uppercase opacity-60 truncate" title={t.referenceNumber}>
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
                                        <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-black uppercase tracking-tighter border border-slate-200">
                                            {t.journals?.[0]?.account?.name || "Uncategorized"}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 text-right font-black tracking-tighter ${t.transactionType === 'PAYMENT' ? 'text-red-500' : 'text-emerald-500'}`}>
                                        {isClient ? (t.transactionType === 'PAYMENT' ? '-' : '+') + " " + formatCurrency(Number(t.amount)) : "Rp ---"}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-xs uppercase text-slate-500">
                                        <div className="flex items-center gap-2">
                                            <Wallet className="w-3 h-3" />
                                            {t.bank}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                onClick={() => {
                                                    setEditingTransaction(t);
                                                    setIsModalOpen(true);
                                                }}
                                                className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                                title="Edit"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(t.id)}
                                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                                title="Hapus"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
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
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingTransaction(null);
                }}
                coa={coa}
                transaction={editingTransaction || undefined}
            />
        </div>
    );
}
