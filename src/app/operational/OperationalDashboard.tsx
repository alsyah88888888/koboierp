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
    Download,
    ChevronUp,
    ChevronDown
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
    const [filterDivision, setFilterDivision] = useState<string>("ALL");
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    const getTransactionDivisions = (t: any) => {
        const divs = new Set<string>();
        const refStr = (t.invoiceNumber || t.referenceNumber || "").toUpperCase();
        if (refStr.includes('KB-TRN') || refStr.includes('SJ-')) {
            const refs = refStr.split(',').map((r: string) => r.trim()).filter(Boolean);
            const matchingDeliveries = initialDeliveries.filter((d: any) => 
                refs.some((r: string) => d.deliveryNumber?.includes(r) || d.invoiceNumber?.includes(r))
            );
            if (matchingDeliveries.length > 0) {
                matchingDeliveries.forEach((d: any) => {
                    if (d.salesPerson) divs.add(d.salesPerson);
                });
                return Array.from(divs);
            }
        }
        if (t.salesPerson) divs.add(t.salesPerson);
        return Array.from(divs);
    };

    const uniqueDivisions = Array.from(new Set([
        ...initialDeliveries.map((d: any) => d.salesPerson),
        ...initialReceipts.map((r: any) => r.salesPerson),
        ...transactions.map((t: any) => t.salesPerson)
    ])).filter(Boolean).sort();

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
        let expenseVal = 0;

        transactions.forEach(e => {
            const isExpense = (e.transactionType === "PAYMENT");
            const amt = isExpense ? Number(e.amount) : -Number(e.amount);
            
            const refStr = (e.invoiceNumber || e.referenceNumber || "").toUpperCase();
            if (refStr.includes('KB-TRN') || refStr.includes('SJ-')) {
                // Find all matching deliveries
                const refs = refStr.split(',').map((r: string) => r.trim()).filter(Boolean);
                const matchingDeliveries = initialDeliveries.filter((d: any) => 
                    refs.some((r: string) => d.deliveryNumber?.includes(r) || d.invoiceNumber?.includes(r))
                );
                
                if (matchingDeliveries.length > 0) {
                    // Split proportionally by total items quantity
                    let totalQty = 0;
                    let qtyForId = 0;
                    
                    matchingDeliveries.forEach((d: any) => {
                        const dQty = d.items?.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0) || 1;
                        totalQty += dQty;
                        if (d.salesPerson === id) {
                            qtyForId += dQty;
                        }
                    });
                    
                    if (totalQty > 0) {
                        expenseVal += (amt * (qtyForId / totalQty));
                    }
                    return; // Done with this transaction
                }
            }
            
            // Fallback: If no deliveries match, use the transaction's own salesPerson field
            if (e.salesPerson === id) {
                expenseVal += amt;
            }
        });

        return {
            salesVal: Math.round(salesVal),
            purchaseVal: Math.round(purchaseVal),
            expenseVal: Math.round(expenseVal),
            margin: Math.round((salesVal - purchaseVal) - expenseVal)
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
            const txDate = new Date(t.date);
            // Adjust for local timezone to ensure date matches what the user selected locally
            const localDateStr = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}-${String(txDate.getDate()).padStart(2, '0')}`;
            matchDate = localDateStr === filterDate;
        } else {
            const txDate = new Date(t.date);
            const txYear = txDate.getFullYear().toString();
            const txMonth = (txDate.getMonth() + 1).toString();
            
            const matchYear = filterYear === "ALL" || txYear === filterYear;
            const matchMonth = filterMonth === "ALL" || txMonth === filterMonth;
            
            matchDate = matchYear && matchMonth;
        }

        let matchDivision = true;
        if (filterDivision !== "ALL") {
            const divs = getTransactionDivisions(t);
            matchDivision = divs.includes(filterDivision);
        }

        return matchSearch && matchType && matchDate && matchDivision;
    });

    const sortedTransactions = [...filteredTransactions].sort((a, b) => {
        if (!sortConfig) return 0;
        
        const getKeyValue = (item: any, key: string) => {
            if (key === 'category') return item.journals?.[0]?.account?.name || "Uncategorized";
            if (key === 'amount') return Number(item.amount);
            if (key === 'date') return new Date(item.date).getTime();
            return item[key] || "";
        };

        const aValue = getKeyValue(a, sortConfig.key);
        const bValue = getKeyValue(b, sortConfig.key);

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
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
        const data: any[] = filteredTransactions.map((t, index) => {
            const desc = t.description || '';
            const prMatch = desc.match(/(KB-PR-\d{8}-\d{3})/);
            const kodePR = prMatch ? prMatch[1] : '-';
            
            const trnMatch = desc.match(/(KB-TR[ND]-\d{8}-\d{3})/);
            const kodeSJ = trnMatch ? trnMatch[1] : '-';
            
            let cleanDesc = desc;
            if (kodePR !== '-') cleanDesc = cleanDesc.replace(`Payment for PR: ${kodePR}`, '').replace(kodePR, '').replace(' - - ', ' - ').trim();
            if (kodeSJ !== '-') cleanDesc = cleanDesc.replace(kodeSJ, '').trim();
            cleanDesc = cleanDesc.replace(/^-\s*/, '').trim();

            return {
                'No': index + 1,
                'Tanggal': format(new Date(t.date), "dd MMM yyyy"),
                'Kode PR': kodePR,
                'Ref / SJ': t.referenceNumber || kodeSJ || '-',
                'Bank': t.bank || '-',
                'Kategori': t.category || 'N/A',
                'Jumlah': Math.abs(Number(t.amount)),
                'Keterangan': cleanDesc || '-',
                'Keterangan Asli': desc,
                'Tipe': t.transactionType
            };
        });

        // Summary Data (Performance)
        data.push({}); // Empty line
        data.push({ 'Keterangan': '--- RINGKASAN PERFORMA ---' });
        
        if (filterDivision === "ALL") {
            uniqueDivisions.forEach(div => {
                const stats = getStats(div as string);
                data.push({ 'Keterangan': `PERFORMA ${div}`, 'Jumlah': stats.margin });
            });
        } else {
            const stats = getStats(filterDivision);
            data.push({ 'Keterangan': `PERFORMA ${filterDivision}`, 'Jumlah': stats.margin });
        }

        exportToExcel(data, `Laporan_Hasil_Operasional_${filterDivision}`, 'Operasional');
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

            {/* Jumlah Operasional Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-100 shadow-xl shadow-slate-200/40 p-6 rounded-3xl flex items-center gap-5 hover:-translate-y-1 transition-all duration-300">
                    <div className="p-4 bg-indigo-50 text-indigo-500 rounded-2xl shadow-inner">
                        <TrendingUp className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jumlah Operasional BC</p>
                        <p className="text-2xl font-black tracking-tighter text-slate-900 mt-1">
                            {formatCurrency(bcStats.expenseVal + bcStats.purchaseVal)}
                        </p>
                    </div>
                </div>

                {userEmail !== 'chici@kolaborasi.id' && (
                    <div className="bg-white border border-slate-100 shadow-xl shadow-slate-200/40 p-6 rounded-3xl flex items-center gap-5 hover:-translate-y-1 transition-all duration-300">
                        <div className="p-4 bg-amber-50 text-amber-500 rounded-2xl shadow-inner">
                            <Wallet className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jumlah Operasional PF</p>
                            <p className="text-2xl font-black tracking-tighter text-slate-900 mt-1">
                                {formatCurrency(pfStats.expenseVal + pfStats.purchaseVal)}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-100 shadow-xl shadow-slate-200/40 p-6 rounded-3xl flex items-center gap-5 hover:-translate-y-1 transition-all duration-300">
                    <div className="p-4 bg-rose-50 text-rose-500 rounded-2xl shadow-inner">
                        <ArrowDownCircle className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Pengeluaran</p>
                        <p className="text-2xl font-black tracking-tighter text-slate-900 mt-1">
                            {isClient ? formatCurrency(Math.round(transactions.filter(t => t.transactionType === "PAYMENT").reduce((sum, t) => sum + Number(t.amount), 0))) : "Rp ---"}
                        </p>
                    </div>
                </div>
                <div className="bg-white border border-slate-100 shadow-xl shadow-slate-200/40 p-6 rounded-3xl flex items-center gap-5 hover:-translate-y-1 transition-all duration-300">
                    <div className="p-4 bg-emerald-50 text-emerald-500 rounded-2xl shadow-inner">
                        <ArrowUpCircle className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Pemasukan</p>
                        <p className="text-2xl font-black tracking-tighter text-slate-900 mt-1">
                            {isClient ? formatCurrency(Math.round(transactions.filter(t => t.transactionType === "RECEIPT").reduce((sum, t) => sum + Number(t.amount), 0))) : "Rp ---"}
                        </p>
                    </div>
                </div>
                <div className="bg-white border border-slate-100 shadow-xl shadow-slate-200/40 p-6 rounded-3xl flex items-center gap-5 hover:-translate-y-1 transition-all duration-300">
                    <div className="p-4 bg-blue-50 text-blue-500 rounded-2xl shadow-inner">
                        <Receipt className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Banyak Transaksi</p>
                        <p className="text-2xl font-black tracking-tighter text-slate-900 mt-1">{transactions.length}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-100 shadow-xl shadow-slate-200/40 rounded-[2rem] overflow-hidden flex flex-col flex-1">
                <div className="p-5 flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4">
                    <div className="flex flex-col md:flex-row gap-3 w-full xl:max-w-4xl">
                        <div className="relative w-full md:w-72 shrink-0 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="Cari transaksi..."
                                className="w-full bg-slate-100/80 border-none rounded-2xl py-2.5 pl-11 pr-4 text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium h-[42px] outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Date Filters */}
                        <div className="flex flex-wrap items-center gap-2 md:gap-3">
                            <input
                                type="date"
                                className="bg-slate-100/80 border-none rounded-2xl py-2.5 px-4 text-[11px] font-black uppercase tracking-widest text-slate-600 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none h-[42px] cursor-pointer"
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
                                        className="bg-slate-100/80 border-none rounded-2xl py-2.5 pl-4 pr-8 text-[11px] font-black uppercase tracking-widest text-slate-600 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none cursor-pointer h-[42px]"
                                    >
                                        <option value="ALL">Semua Bulan</option>
                                        {months.map((m, i) => (
                                            <option key={i} value={(i + 1).toString()}>{m}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={filterYear}
                                        onChange={(e) => setFilterYear(e.target.value)}
                                        className="bg-slate-100/80 border-none rounded-2xl py-2.5 pl-4 pr-8 text-[11px] font-black uppercase tracking-widest text-slate-600 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none cursor-pointer h-[42px]"
                                    >
                                        <option value="ALL">Semua Tahun</option>
                                        {years.map(y => (
                                            <option key={y} value={y.toString()}>{y}</option>
                                        ))}
                                    </select>
                                </>
                            )}
                            <select
                                value={filterDivision}
                                onChange={(e) => setFilterDivision(e.target.value)}
                                className="bg-slate-100/80 border-none rounded-2xl py-2.5 pl-4 pr-8 text-[11px] font-black uppercase tracking-widest text-slate-600 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none cursor-pointer h-[42px]"
                            >
                                <option value="ALL">Semua Divisi</option>
                                {uniqueDivisions.map(div => (
                                    <option key={div as string} value={div as string}>{div as string}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[10px] md:text-xs font-black uppercase tracking-widest justify-center shrink-0 bg-slate-200/50 p-1.5 rounded-2xl">
                        <button 
                            className={`px-5 py-2 rounded-xl flex-1 md:flex-none transition-all ${filterType === "ALL" ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
                            onClick={() => setFilterType("ALL")}
                        >Semua</button>
                        <button 
                            className={`px-5 py-2 rounded-xl flex-1 md:flex-none transition-all ${filterType === "EXPENSE" ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
                            onClick={() => setFilterType("EXPENSE")}
                        >Expenses</button>
                        <button 
                            className={`px-5 py-2 rounded-xl flex-1 md:flex-none transition-all ${filterType === "INCOME" ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
                            onClick={() => setFilterType("INCOME")}
                        >Income</button>
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left table-fixed min-w-[900px]">
                        <thead className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 w-32 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => handleSort('date')}>
                                    <div className="flex items-center justify-between">Tanggal {sortConfig?.key === 'date' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                                </th>
                                <th className="px-6 py-4 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => handleSort('description')}>
                                    <div className="flex items-center justify-between">Deskripsi {sortConfig?.key === 'description' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                                </th>
                                <th className="px-6 py-4 w-40 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => handleSort('category')}>
                                    <div className="flex items-center justify-between">Kategori {sortConfig?.key === 'category' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                                </th>
                                <th className="px-6 py-4 text-right w-40 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => handleSort('amount')}>
                                    <div className="flex items-center justify-end gap-1">Jumlah {sortConfig?.key === 'amount' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                                </th>
                                <th className="px-6 py-4 w-32">Metode</th>
                                <th className="px-6 py-4 text-center w-20">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {sortedTransactions.map((t) => (
                                <tr key={t.id} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="px-6 py-5 font-bold text-slate-500">
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
                                    <td className="px-6 py-5">
                                        <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-black uppercase tracking-tighter border border-slate-200">
                                            {t.journals?.[0]?.account?.name || "Uncategorized"}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-5 text-right font-black tracking-tighter ${t.transactionType === 'PAYMENT' ? 'text-red-500' : 'text-emerald-500'}`}>
                                        {isClient ? (t.transactionType === 'PAYMENT' ? '-' : '+') + " " + formatCurrency(Number(t.amount)) : "Rp ---"}
                                    </td>
                                    <td className="px-6 py-5 font-bold text-xs uppercase text-slate-500">
                                        <div className="flex items-center gap-2">
                                            <Wallet className="w-3 h-3" />
                                            {t.bank}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-center">
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
