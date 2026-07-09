"use client";

import { useState, useEffect } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell
} from "recharts";
import {
    TrendingUp,
    TrendingDown,
    Package,
    ShoppingCart,
    ShoppingBag,
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    Download,
    Calendar,
    Activity,
    FileSpreadsheet,
    ChevronRight,
    Clock,
    CreditCard,
    DollarSign,
    PiggyBank,
    Receipt,
    Target,
    Truck,
    ArrowRight,
    CheckCircle2,
    AlertCircle,
    BarChart3,
    ShieldCheck,
    RefreshCw
} from "lucide-react";

import * as XLSX from 'xlsx';
import { formatCurrency, cn } from "@/lib/utils";
import { RoleGuideline } from "@/components/RoleGuideline";
import Link from "next/link";


const COLORS = ['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const IconMap: any = {
    ShoppingBag,
    Wallet,
    ShoppingCart,
    Package,
    TrendingUp
};

export function AdminDashboard({ 
    role, 
    stats, 
    salesData, 
    inventoryData, 
    recentActivity, 
    lowStockCount, 
    lowStockProducts = [], 
    activeOrdersToday, 
    dailyReport,
    totalPaidSales = 0,
    totalPaidPurchases = 0,
    totalPiutangPending = 0,
    totalHutangPending = 0,
    traceabilityData
}: any) {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const { sales = [], purchases = [], operational = [], requests = [], dailyStats = {} } = dailyReport || {};

    const handleExportExcel = () => {
        const wb = XLSX.utils.book_new();

        // 1. Sales Tab (Filter out voided transactions)
        const activeSales = sales.filter((s: any) => !s.isVoid && String(s.isVoid).toLowerCase() !== "true");
        const salesRows = activeSales.map((s: any) => ({
            "Bulan": new Date(s.date).toLocaleString('id-ID', { month: 'long' }),
            "Tgl Transaksi": new Date(s.date).toLocaleDateString('id-ID'),
            "No. Transaksi": s.deliveryNumber,
            "PO BUYER": s.poNumber || "-",
            "Buyer": s.buyerName,
            "Penerima": s.recipient,
            "Total Harga": Number(s.subtotal || 0) - Number(s.totalDiscount || 0),
            "PPN 11%": Number(s.taxAmount || 0),
            "Grand Total Netto": Number(s.grandTotal || 0),
            "Status": s.paymentStatus === 'PAID' ? 'DONE' : (s.paymentStatus || 'PENDING'),
            "Operator": s.createdBy?.name || "System",
            "Waktu Input": new Date(s.createdAt).toLocaleString('id-ID'),
            "Ref Bank": `${s.deliveryNumber} - ${s.buyerName}`
        }));
        const wsSales = XLSX.utils.json_to_sheet(salesRows);
        XLSX.utils.book_append_sheet(wb, wsSales, "Penjualan");

        // 2. Purchases Tab
        const purchRows = purchases.map((p: any) => ({
            "Bulan": new Date(p.date).toLocaleString('id-ID', { month: 'long' }),
            "Tgl Transaksi": new Date(p.date).toLocaleDateString('id-ID'),
            "No. Terima": p.receiptNumber,
            "PO BUYER": p.poNumber || "-",
            "Supplier": p.receivedFrom,
            "Gudang": p.warehouse?.name || "-",
            "Total": Number(p.grandTotal),
            "Status": p.paymentStatus === 'PAID' ? 'DONE' : (p.paymentStatus || 'PENDING'),
            "Operator": p.createdBy?.name || "System",
            "Waktu Input": new Date(p.createdAt).toLocaleString('id-ID'),
            "Ref Bank": `${p.receiptNumber} - ${p.receivedFrom}`
        }));
        const wsPurch = XLSX.utils.json_to_sheet(purchRows);
        XLSX.utils.book_append_sheet(wb, wsPurch, "Pembelian");

        // 3. Operational Tab
        const opsRows = operational.map((o: any) => ({
            "Bulan": new Date(o.date).toLocaleString('id-ID', { month: 'long' }),
            "Tgl Transaksi": new Date(o.date).toLocaleDateString('id-ID'),
            "Keterangan": o.description,
            "Bank/Metode": o.bank,
            "Kategori": o.category || "-",
            "Total": Number(o.amount),
            "Status": o.status === 'PAID' ? 'DONE' : (o.status || 'DONE'),
            "Operator": o.createdBy?.name || "System",
            "Waktu Input": new Date(o.createdAt).toLocaleString('id-ID')
        }));
        const wsOps = XLSX.utils.json_to_sheet(opsRows);
        XLSX.utils.book_append_sheet(wb, wsOps, "Operasional");

        // 4. Purchase Requests Tab
        const reqRows = requests.map((r: any) => ({
            "Bulan": new Date(r.createdAt).toLocaleString('id-ID', { month: 'long' }),
            "No. PR": r.number,
            "Pemohon": r.requestedBy?.name || "-",
            "Status": r.status,
            "Catatan": r.notes || "-",
            "Waktu Input": new Date(r.createdAt).toLocaleString('id-ID')
        }));
        const wsReq = XLSX.utils.json_to_sheet(reqRows);
        XLSX.utils.book_append_sheet(wb, wsReq, "Permintaan Barang");

        // Save
        XLSX.writeFile(wb, `Laporan_Kerja_Harian_${new Date().toISOString().split('T')[0]}.xlsx`);
    };
    const financialStats = stats.filter((s: any) => ['Total Revenue', 'Nett Margin Sales', 'Cash/Bank Balance'].includes(s.name));
    const performanceStats = stats.filter((s: any) => ['Margin BC', 'Margin PF'].includes(s.name));
    const liabilityStats = stats.filter((s: any) => ['Total Hutang (Pending)', 'Total Piutang (Pending)'].includes(s.name));

    const renderStatCard = (stat: any, i: number) => (
        <div key={i} className="erp-card p-6 relative group border-slate-200/40">
            <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-slate-900/[0.02] blur-3xl transition-all group-hover:scale-150 group-hover:bg-primary/5" />
            <div className="relative flex flex-col justify-between h-full space-y-5">
                <div className="flex items-center justify-between">
                    <div className={cn(stat.iconBg, "p-3.5 rounded-2xl shadow-sm border border-white/50 backdrop-blur-md")}>
                        {(() => {
                            const Icon = IconMap[stat.iconName] || Package;
                            return <Icon className={stat.iconColor + " h-5 w-5"} />;
                        })()}
                    </div>
                    <div className={cn(
                        "flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-tight shadow-sm border border-white/40",
                        stat.trend === 'up' ? 'text-emerald-700 bg-emerald-50/80 border-emerald-100/50' : 'text-rose-700 bg-rose-50/80 border-rose-100/50'
                    )}>
                        {stat.trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {stat.change}
                    </div>
                </div>
                <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-0.5">{stat.name}</p>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">
                        {isClient ? stat.value : "Rp ---"}
                    </h3>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 md:space-y-12 pb-16 animate-fade-up">
            {/* Role-Specific SOP Guideline */}
            <RoleGuideline role={role} />

            {/* ═══════ PO STATUS — PALING ATAS ═══════ */}
            {traceabilityData ? (
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                        <div className="h-5 w-2 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full" />
                        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Status Purchase Order</h2>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
                        <span className="flex items-center gap-1.5 text-amber-600"><AlertCircle className="h-3.5 w-3.5" /> Open: {traceabilityData.poSummary?.open || 0}</span>
                        <span className="flex items-center gap-1.5 text-blue-600"><Truck className="h-3.5 w-3.5" /> Partial: {traceabilityData.poSummary?.partial || 0}</span>
                        <span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> Closed: {traceabilityData.poSummary?.closed || 0}</span>
                    </div>
                </div>
                {((traceabilityData.poSummary?.open || 0) + (traceabilityData.poSummary?.partial || 0)) > 0 ? (
                <div className="erp-card overflow-hidden border-amber-200/60">
                    <div className="overflow-x-auto"><table className="w-full text-[11px]">
                        <thead><tr className="bg-slate-900 text-white">
                            <th className="px-4 py-2.5 text-left font-black uppercase tracking-wider">No. PO</th>
                            <th className="px-4 py-2.5 text-left font-black uppercase tracking-wider">Buyer</th>
                            <th className="px-4 py-2.5 text-right font-black uppercase tracking-wider w-20">Total Qty</th>
                            <th className="px-4 py-2.5 text-right font-black uppercase tracking-wider w-20">Terkirim</th>
                            <th className="px-4 py-2.5 text-center font-black uppercase tracking-wider w-28">Progress</th>
                            <th className="px-4 py-2.5 text-center font-black uppercase tracking-wider w-20">Status</th>
                        </tr></thead>
                        <tbody>
                            {[...(traceabilityData.poSummary?.openOrders || []), ...(traceabilityData.poSummary?.partialOrders || [])].map((po: any, i: number) => {
                                const pct = Math.round((po.shippedQty / Math.max(1, po.totalQty)) * 100);
                                return (<tr key={i} className={`border-b border-slate-100 hover:bg-amber-50/30 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                    <td className="px-4 py-2 font-black text-slate-900">{po.orderNumber}</td>
                                    <td className="px-4 py-2 font-bold text-slate-700 truncate max-w-[200px]">{po.buyerName}</td>
                                    <td className="px-4 py-2 text-right font-black tabular-nums">{po.totalQty}</td>
                                    <td className="px-4 py-2 text-right font-black tabular-nums">{po.shippedQty}</td>
                                    <td className="px-4 py-2"><div className="flex items-center gap-2"><div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : pct > 50 ? 'bg-blue-500' : 'bg-amber-400'}`} style={{ width: `${Math.min(100, pct)}%` }} /></div><span className="text-[10px] font-black text-slate-500 tabular-nums w-8 text-right">{pct}%</span></div></td>
                                    <td className="px-4 py-2 text-center"><span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${pct > 0 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{pct > 0 ? 'PARTIAL' : 'OPEN'}</span></td>
                                </tr>);
                            })}
                        </tbody>
                    </table></div>
                </div>
                ) : (
                <div className="erp-card p-5 text-center border-emerald-200/60 bg-emerald-50/30">
                    <p className="text-[11px] font-black text-emerald-700 uppercase tracking-widest flex items-center justify-center gap-2"><CheckCircle2 className="h-4 w-4" /> Semua PO sudah CLOSED — {traceabilityData.poSummary?.closed || 0} PO selesai</p>
                </div>
                )}
                </div>
            ) : null}

            {/* ═══════ STATUS PENJUALAN & PEMBELIAN HARI INI ═══════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status Penjualan */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <div className="h-5 w-2 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full" />
                            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Status Penjualan Hari Ini</h2>
                        </div>
                    </div>
                    <div className="erp-card overflow-hidden border-blue-200/60">
                        <div className="overflow-x-auto">
                            <table className="w-full text-[11px]">
                                <thead>
                                    <tr className="bg-slate-900 text-white">
                                        <th className="px-4 py-2.5 text-left font-black uppercase tracking-wider">No. SJ / Inv</th>
                                        <th className="px-4 py-2.5 text-left font-black uppercase tracking-wider">Buyer</th>
                                        <th className="px-4 py-2.5 text-right font-black uppercase tracking-wider">Total</th>
                                        <th className="px-4 py-2.5 text-center font-black uppercase tracking-wider">Status Bayar</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sales.length > 0 ? sales.map((s: any, i: number) => (
                                        <tr key={i} className={`border-b border-slate-100 hover:bg-blue-50/30 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                            <td className="px-4 py-2 font-black text-slate-900">{s.deliveryNumber}</td>
                                            <td className="px-4 py-2 font-bold text-slate-700">{s.buyerName || s.recipient}</td>
                                            <td className="px-4 py-2 text-right font-black tabular-nums">{formatCurrency(s.grandTotal)}</td>
                                            <td className="px-4 py-2 text-center">
                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${s.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {s.paymentStatus || 'PENDING'}
                                                </span>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-6 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                                                Tidak ada penjualan hari ini
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Status Pembelian */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <div className="h-5 w-2 bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-full" />
                            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Status Pembelian Hari Ini</h2>
                        </div>
                    </div>
                    <div className="erp-card overflow-hidden border-emerald-200/60">
                        <div className="overflow-x-auto">
                            <table className="w-full text-[11px]">
                                <thead>
                                    <tr className="bg-slate-900 text-white">
                                        <th className="px-4 py-2.5 text-left font-black uppercase tracking-wider">No. Penerimaan</th>
                                        <th className="px-4 py-2.5 text-left font-black uppercase tracking-wider">Supplier</th>
                                        <th className="px-4 py-2.5 text-right font-black uppercase tracking-wider">Total</th>
                                        <th className="px-4 py-2.5 text-center font-black uppercase tracking-wider">Verifikasi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {purchases.length > 0 ? purchases.map((p: any, i: number) => (
                                        <tr key={i} className={`border-b border-slate-100 hover:bg-emerald-50/30 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                            <td className="px-4 py-2 font-black text-slate-900">{p.receiptNumber}</td>
                                            <td className="px-4 py-2 font-bold text-slate-700">{p.receivedFrom}</td>
                                            <td className="px-4 py-2 text-right font-black tabular-nums">{formatCurrency(p.grandTotal)}</td>
                                            <td className="px-4 py-2 text-center">
                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${p.isVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {p.isVerified ? 'VERIFIED' : 'PENDING'}
                                                </span>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-6 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                                                Tidak ada pembelian hari ini
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-4 mb-2">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-2 bg-slate-900 rounded-full" />
                            <span className="text-[12px] font-black text-slate-900 uppercase tracking-[0.2em]">Batch Traceability Report (Live)</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Linked Purchase → Sales Lifecycle</span>
                        </div>
                    </div>
 
                    <div className="erp-card overflow-hidden border-slate-200/60 shadow-2xl shadow-slate-200/40">
                        <div className="overflow-x-auto">
                            <table className="w-full text-[11px] border-collapse">
                                <thead>
                                    <tr className="bg-slate-900 text-white">
                                        <th className="px-4 py-4 text-left font-black uppercase tracking-wider whitespace-nowrap">Tgl Beli</th>
                                        <th className="px-4 py-4 text-left font-black uppercase tracking-wider whitespace-nowrap">No. Lot / Batch</th>
                                        <th className="px-4 py-4 text-left font-black uppercase tracking-wider">Supplier</th>
                                        <th className="px-4 py-4 text-left font-black uppercase tracking-wider whitespace-nowrap">Tgl Jual</th>
                                        <th className="px-4 py-4 text-left font-black uppercase tracking-wider whitespace-nowrap">No. SJ</th>
                                        <th className="px-4 py-4 text-left font-black uppercase tracking-wider">Buyer</th>
                                        <th className="px-4 py-4 text-left font-black uppercase tracking-wider">SKU / Nama Barang</th>
                                        <th className="px-4 py-4 text-right font-black uppercase tracking-wider">Qty</th>
                                        <th className="px-4 py-4 text-right font-black uppercase tracking-wider">Harga Beli</th>
                                        <th className="px-4 py-4 text-right font-black uppercase tracking-wider">Harga Jual</th>
                                        <th className="px-4 py-4 text-right font-black uppercase tracking-wider">Profit</th>
                                        <th className="px-4 py-4 text-center font-black uppercase tracking-wider">Margin</th>
                                        <th className="px-4 py-4 text-center font-black uppercase tracking-wider whitespace-nowrap">Beli (F)</th>
                                        <th className="px-4 py-4 text-center font-black uppercase tracking-wider whitespace-nowrap">Jual (F)</th>
                                        <th className="px-4 py-4 text-center font-black uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(traceabilityData.recentDetailed || []).map((row: any, i: number) => {
                                        const marginNum = parseFloat(row['Margin %']);
                                        return (
                                            <tr key={i} className={`hover:bg-blue-50/50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}`}>
                                                <td className="px-4 py-3 font-bold text-slate-500 whitespace-nowrap">{row['TANGGAL BELI']}</td>
                                                <td className="px-4 py-3 font-black text-slate-900 whitespace-nowrap tracking-tight">{row['NOMOR LPB']}</td>
                                                <td className="px-4 py-3 font-bold text-slate-700 truncate max-w-[150px]">{row['NAMA SUPPLIER']}</td>
                                                <td className="px-4 py-3 font-bold text-slate-500 whitespace-nowrap text-blue-600">{row['TANGGAL JUAL']}</td>
                                                <td className="px-4 py-3 font-black text-slate-900 whitespace-nowrap tracking-tight">{row['NOMOR SJ']}</td>
                                                <td className="px-4 py-3 font-bold text-slate-700 truncate max-w-[150px]">{row['NAMA PEMBELI']}</td>
                                                <td className="px-4 py-3">
                                                    <p className="font-black text-slate-900 leading-none mb-1">{row['BARCODE']}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[200px]">{row['KETERANGAN ITEM']}</p>
                                                </td>
                                                <td className="px-4 py-3 text-right font-black text-slate-900 tabular-nums">{row['QTY JUAL']}</td>
                                                <td className="px-4 py-3 text-right font-black text-slate-500 whitespace-nowrap tabular-nums">{formatCurrency(row['HARGA BELI'])}</td>
                                                <td className="px-4 py-3 text-right font-black text-slate-900 whitespace-nowrap tabular-nums">{formatCurrency(row['HARGA JUAL'])}</td>
                                                <td className={`px-4 py-3 text-right font-black whitespace-nowrap tabular-nums ${row['MARGIN'] >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {formatCurrency(row['MARGIN'])}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2.5 py-1 rounded-lg font-black text-[10px] ${
                                                        marginNum > 20 ? 'bg-emerald-100 text-emerald-700' :
                                                        marginNum > 10 ? 'bg-blue-100 text-blue-700' :
                                                        marginNum > 0 ? 'bg-amber-100 text-amber-700' :
                                                        'bg-rose-100 text-rose-700'
                                                    }`}>
                                                        {row['MARGIN %']}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                    <span className={`px-2.5 py-1 rounded-lg font-black text-[8px] uppercase tracking-tighter border bg-emerald-50 text-emerald-600 border-emerald-100`}>
                                                        PAID
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                    <span className={`px-2.5 py-1 rounded-lg font-black text-[8px] uppercase tracking-tighter border ${
                                                        row['PAYMENT'] === 'PAID' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                        row['PAYMENT'] === 'PARTIAL' || row['PAYMENT'] === 'CREDIT' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                        'bg-slate-50 text-slate-400 border-slate-100'
                                                    }`}>
                                                        {row['PAYMENT'] === 'PAID' ? 'PAID' : 
                                                         row['PAYMENT'] === 'PARTIAL' ? 'PART' :
                                                         row['PAYMENT'] === 'CREDIT' ? 'CR' : 'PEND'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-tighter bg-slate-900 text-white shadow-lg shadow-slate-200`}>
                                                        TERJUAL (LOT)
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
    );
}
