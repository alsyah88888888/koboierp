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
    ChevronRight
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

export function AdminDashboard({ role, stats, salesData, inventoryData, recentActivity, lowStockCount, lowStockProducts = [], activeOrdersToday, dailyReport }: any) {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const { sales = [], purchases = [], operational = [], requests = [], dailyStats = {} } = dailyReport || {};

    const handleExportExcel = () => {
        const wb = XLSX.utils.book_new();

        // 1. Sales Tab
        const salesRows = sales.map((s: any) => ({
            "No. Transaksi": s.deliveryNumber,
            "No. PO": s.poNumber || "-",
            "Buyer": s.buyerName,
            "Penerima": s.recipient,
            "Total": Number(s.grandTotal),
            "Status": s.paymentStatus,
            "Waktu Input": new Date(s.createdAt).toLocaleString('id-ID'),
            "Operator": s.createdBy?.name || "System",
            "Tanggal SJ": s.date ? new Date(s.date).toLocaleDateString('id-ID') : "-"
        }));
        const wsSales = XLSX.utils.json_to_sheet(salesRows);
        XLSX.utils.book_append_sheet(wb, wsSales, "Penjualan");

        // 2. Purchases Tab
        const purchRows = purchases.map((p: any) => ({
            "No. Terima": p.receiptNumber,
            "Supplier": p.receivedFrom,
            "Gudang": p.warehouse?.name || "-",
            "Total": Number(p.grandTotal),
            "Status": p.paymentStatus,
            "Waktu Input": new Date(p.createdAt).toLocaleString('id-ID'),
            "Operator": p.createdBy?.name || "System",
            "Tgl Transaksi": p.date ? new Date(p.date).toLocaleDateString('id-ID') : "-"
        }));
        const wsPurch = XLSX.utils.json_to_sheet(purchRows);
        XLSX.utils.book_append_sheet(wb, wsPurch, "Pembelian");

        // 3. Operational Tab
        const opsRows = operational.map((o: any) => ({
            "Keterangan": o.description,
            "Bank/Metode": o.bank,
            "Kategori": o.category || "-",
            "Total": Number(o.amount),
            "Waktu Input": new Date(o.createdAt).toLocaleString('id-ID'),
            "Operator": o.createdBy?.name || "System",
            "Tgl Transaksi": new Date(o.date).toLocaleDateString('id-ID')
        }));
        const wsOps = XLSX.utils.json_to_sheet(opsRows);
        XLSX.utils.book_append_sheet(wb, wsOps, "Operasional");

        // 4. Purchase Requests Tab
        const reqRows = requests.map((r: any) => ({
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

            {/* Today's High-Level Activity */}
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-2">
                    <div className="flex items-center gap-4">
                        <div className="h-5 w-2 bg-primary rounded-full shadow-lg shadow-primary/20" />
                        <div>
                            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Live Insights</h2>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Real-time Daily Performance</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleExportExcel}
                        className="erp-btn-primary !bg-emerald-600 hover:!bg-emerald-700 !px-6 !py-3 shadow-emerald-200 w-full sm:w-auto"
                    >
                        <FileSpreadsheet className="h-4 w-4" />
                        <span>Download Report</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                    {/* Today's Sales */}
                    <div className="erp-card p-8 relative overflow-hidden group hover:border-blue-200/50">
                        <div className="absolute -right-8 -top-8 h-40 w-40 bg-blue-100/30 rounded-full blur-3xl transition-transform group-hover:scale-125" />
                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shadow-sm border border-blue-100/50">
                                    <ShoppingBag className="h-5 w-5" />
                                </div>
                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-50/80 px-2.5 py-1 rounded-full border border-blue-100/50">Today Sales</span>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-3xl font-black text-slate-900 tracking-tighter">
                                    {isClient ? formatCurrency(dailyStats.totalSales || 0) : "Rp ---"}
                                </h4>
                                <div className="flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-pulse" />
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{dailyStats.countSales || 0} Invoices Generated</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Today's Purchases */}
                    <div className="erp-card p-8 relative overflow-hidden group hover:border-emerald-200/50">
                        <div className="absolute -right-8 -top-8 h-40 w-40 bg-emerald-100/30 rounded-full blur-3xl transition-transform group-hover:scale-125" />
                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shadow-sm border border-emerald-100/50">
                                    <ShoppingCart className="h-5 w-5" />
                                </div>
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50/80 px-2.5 py-1 rounded-full border border-emerald-100/50">Purchases</span>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-3xl font-black text-slate-900 tracking-tighter">
                                    {isClient ? formatCurrency(dailyStats.totalPurchases || 0) : "Rp ---"}
                                </h4>
                                <div className="flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{dailyStats.countPurchases || 0} Goods Received</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Today's Ops */}
                    <div className="erp-card p-8 relative overflow-hidden group hover:border-amber-200/50">
                        <div className="absolute -right-8 -top-8 h-40 w-40 bg-amber-100/30 rounded-full blur-3xl transition-transform group-hover:scale-125" />
                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl shadow-sm border border-amber-100/50">
                                    <Activity className="h-5 w-5" />
                                </div>
                                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest bg-amber-50/80 px-2.5 py-1 rounded-full border border-amber-100/50">Operational</span>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-3xl font-black text-slate-900 tracking-tighter">
                                    {isClient ? formatCurrency(dailyStats.totalOps || 0) : "Rp ---"}
                                </h4>
                                <div className="flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 bg-amber-500 rounded-full animate-pulse" />
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{dailyStats.countOps || 0} Cash Movements</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Today's PR */}
                    <div className="erp-card p-8 relative overflow-hidden group hover:border-purple-200/50">
                        <div className="absolute -right-8 -top-8 h-40 w-40 bg-purple-100/30 rounded-full blur-3xl transition-transform group-hover:scale-125" />
                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl shadow-sm border border-purple-100/50">
                                    <Package className="h-5 w-5" />
                                </div>
                                <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest bg-purple-50/80 px-2.5 py-1 rounded-full border border-purple-100/50">Requests</span>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-3xl font-black text-slate-900 tracking-tighter">
                                    {dailyStats.countRequests || 0} <span className="text-sm text-slate-400">PRs</span>
                                </h4>
                                <div className="flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 bg-purple-500 rounded-full animate-pulse" />
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending Verification</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Live Input Diary */}
                <div className="erp-card bg-slate-50/50 border-slate-200/40 p-8 md:p-10">
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-5">
                            <div className="p-4 bg-white rounded-2xl shadow-xl shadow-slate-100 border border-slate-50 transition-transform hover:scale-110">
                                <Activity className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Live Activity Stream</h3>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Real-time data entry monitor</p>
                            </div>
                        </div>
                        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                             <div className="h-2 w-2 bg-emerald-500 rounded-full animate-ping" />
                             <span className="text-[10px] font-black uppercase tracking-widest">Active Connection</span>
                        </div>
                    </div>

                    <div className="space-y-4 max-h-[440px] overflow-y-auto pr-4 custom-scrollbar scrollbar-hide">
                        {(() => {
                            const activities = [
                                ...sales.map((s: any) => ({ ...s, activityType: 'SALE' })),
                                ...purchases.map((p: any) => ({ ...p, activityType: 'PURCHASE' })),
                                ...operational.map((o: any) => ({ ...o, activityType: 'FINANCE' })),
                                ...requests.map((r: any) => ({ ...r, activityType: 'REQUEST' }))
                            ].filter(a => a.createdAt).sort((a, b) => {
                                try {
                                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                                } catch { return 0; }
                            });

                            if (activities.length === 0) {
                                return (
                                    <div className="text-center py-16 opacity-40">
                                        <div className="bg-slate-100 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-slate-300">
                                            <Activity className="h-6 w-6 text-slate-400" />
                                        </div>
                                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">No activities recorded today</p>
                                    </div>
                                );
                            }

                            return activities.map((act: any, idx: number) => (
                            <div key={idx} className="bg-white p-5 rounded-[1.5rem] flex flex-col sm:flex-row sm:items-center justify-between gap-6 group hover:shadow-xl hover:shadow-slate-200/30 transition-all border border-transparent hover:border-slate-100 animate-fade-up">
                                <div className="flex items-center gap-5">
                                    <div className={`p-4 rounded-2xl shrink-0 shadow-sm transition-all group-hover:scale-110 ${
                                        act.activityType === 'SALE' ? 'bg-blue-50 text-blue-600 border border-blue-100/50' :
                                        act.activityType === 'PURCHASE' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50' :
                                        act.activityType === 'FINANCE' ? 'bg-amber-50 text-amber-600 border border-amber-100/50' :
                                        'bg-purple-50 text-purple-600 border border-purple-100/50'
                                    }`}>
                                        {act.activityType === 'SALE' && <ShoppingBag className="h-5 w-5" />}
                                        {act.activityType === 'PURCHASE' && <ShoppingCart className="h-5 w-5" />}
                                        {act.activityType === 'FINANCE' && <Wallet className="h-5 w-5" />}
                                        {act.activityType === 'REQUEST' && <Package className="h-5 w-5" />}
                                    </div>
                                    <div className="min-w-0 space-y-1.5">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className="text-[13px] font-black text-slate-900 tracking-tight">
                                                {act.deliveryNumber || act.receiptNumber || act.number || act.description}
                                            </span>
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                                                {isClient ? new Date(act.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                                            </span>
                                        </div>
                                        <p className="text-[11px] font-bold text-slate-400 flex items-center gap-2">
                                            {act.activityType === 'SALE' ? `Transactional shipment to ${act.buyerName || '-'}` :
                                             act.activityType === 'PURCHASE' ? `Inbound supply from ${act.receivedFrom || '-'}` :
                                             act.activityType === 'REQUEST' ? `New stock request: ${act.notes || 'No description'}` :
                                             `Finance movement in ${act.category || 'General'}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-5 sm:pl-6 sm:border-l border-slate-100">
                                    <div className="text-left sm:text-right">
                                        <div className="text-[11px] font-black text-slate-900 uppercase tracking-tight">
                                            {act.createdBy?.name || act.requestedBy?.name || "Verified App"}
                                        </div>
                                        <div className={`text-[9px] font-black uppercase tracking-[0.2em] mt-1 ${
                                            act.activityType === 'SALE' ? 'text-blue-500' :
                                            act.activityType === 'PURCHASE' ? 'text-emerald-500' :
                                            act.activityType === 'FINANCE' ? 'text-amber-500' :
                                            'text-purple-500'
                                        }`}>
                                            Module: {act.activityType}
                                        </div>
                                    </div>
                                    <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors" />
                                    </div>
                                </div>
                            </div>
                        ));
                    })()}
                    </div>
                </div>
            </div>

            {/* Financial Overview Card Grid */}
            <div className="space-y-6">
                <div className="flex items-center gap-4 px-2">
                    <div className="h-4 w-1.5 bg-indigo-500 rounded-full" />
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Equity & Treasury</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {financialStats.map(renderStatCard)}
                </div>
            </div>

            {/* Performance & Liabilites Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pt-4">
                <div className="space-y-6">
                    <div className="flex items-center gap-4 px-2">
                        <div className="h-4 w-1.5 bg-amber-500 rounded-full" />
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Team Operations</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {performanceStats.map(renderStatCard)}
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="flex items-center gap-4 px-2">
                        <div className="h-4 w-1.5 bg-rose-500 rounded-full" />
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Accounts Payable/Receivable</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {liabilityStats.map(renderStatCard)}
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10 pt-4">
                {/* Sales Area Chart */}
                <div className="lg:col-span-2 erp-card p-6 md:p-10 border-slate-200/50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
                        <div className="space-y-1">
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Weekly System Velocity</h3>
                            <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">Inbound vs Outbound Data flow</p>
                        </div>
                        <select className="bg-slate-50 border-2 border-slate-100 px-5 py-3 rounded-2xl text-[10px] font-black text-slate-600 uppercase tracking-widest outline-none focus:border-primary transition-all cursor-pointer">
                            <option>Last 7 Cycles</option>
                            <option>Last 30 Cycles</option>
                        </select>
                    </div>
                    <div className="h-[360px] w-full">
                        {isClient && (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorPurch" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} dy={20} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} />

                                    <Tooltip
                                        contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', padding: '16px 20px', backgroundColor: '#fff' }}
                                        itemStyle={{ fontWeight: '900', fontSize: '12px' }}
                                    />
                                    <Area type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" dot={{ r: 5, fill: '#3b82f6', strokeWidth: 3, stroke: '#fff' }} activeDot={{ r: 8, strokeWidth: 0 }} />
                                    <Area type="monotone" dataKey="purchases" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorPurch)" dot={{ r: 5, fill: '#10b981', strokeWidth: 3, stroke: '#fff' }} activeDot={{ r: 8, strokeWidth: 0 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Team Intelligence Insight */}
                <div className="erp-card p-10 flex flex-col group border-slate-200/40 bg-slate-900 text-white overflow-hidden relative">
                     <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform">
                        <TrendingUp className="h-32 w-32" />
                    </div>
                    <div className="relative z-10">
                        <div className="mb-10">
                            <h3 className="text-xl font-black tracking-tight">Team Profitability</h3>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Gross Margin Breakdown (BC vs PF)</p>
                        </div>
                        
                        <div className="space-y-10">
                            {/* BC Team */}
                            <div className="space-y-3 font-black">
                                <div className="flex justify-between items-end">
                                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Team BC (Biru)</span>
                                    <span className="text-lg font-black text-white">{isClient ? stats.find((s: any) => s.name === 'Margin BC')?.value : "..."}</span>
                                </div>
                                <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
                                    {(() => {
                                        const val = Number((stats.find((s: any) => s.name === 'Margin BC')?.value || "0").toString().replace(/[^0-9,-]+/g, "").replace(",", "."));
                                        const total = Number((stats.find((s: any) => s.name === 'Total Revenue')?.value || "1").toString().replace(/[^0-9,-]+/g, "").replace(",", "."));
                                        const pct = Math.min(100, (val / Math.max(1, total)) * 100);
                                        return (
                                            <div 
                                                className="h-full bg-blue-500 rounded-full transition-all duration-1000" 
                                                style={{ width: `${isClient ? pct : 0}%` }}
                                            />
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* PF Team */}
                            <div className="space-y-3 font-black">
                                <div className="flex justify-between items-end">
                                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Team PF (Ungu)</span>
                                    <span className="text-lg font-black text-white">{isClient ? stats.find((s: any) => s.name === 'Margin PF')?.value : "..."}</span>
                                </div>
                                <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
                                    {(() => {
                                        const val = Number((stats.find((s: any) => s.name === 'Margin PF')?.value || "0").toString().replace(/[^0-9,-]+/g, "").replace(",", "."));
                                        const total = Number((stats.find((s: any) => s.name === 'Total Revenue')?.value || "1").toString().replace(/[^0-9,-]+/g, "").replace(",", "."));
                                        const pct = Math.min(100, (val / Math.max(1, total)) * 100);
                                        return (
                                            <div 
                                                className="h-full bg-purple-500 rounded-full transition-all duration-1000" 
                                                style={{ width: `${isClient ? pct : 0}%` }}
                                            />
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 p-6 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm">
                            <div className="flex gap-4">
                                <Activity className="h-5 w-5 text-primary shrink-0" />
                                <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-tight">
                                    Analitik margin tim membantu memantau kontribusi profitabilitas setiap divisi secara real-time terhadap total Nett Margin perusahaan.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Inventory Pie Chart */}
                <div className="erp-card p-10 flex flex-col group border-slate-200/50 bg-gradient-to-b from-white to-slate-50/30">
                    <div className="mb-10">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Stock Integrity</h3>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Allocation by Category</p>
                    </div>
                    <div className="flex-1 min-h-[280px] relative">
                        {isClient && (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={inventoryData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={105}
                                        paddingAngle={8}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {inventoryData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity outline-none" />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', padding: '16px 20px' }}
                                        itemStyle={{ fontWeight: '900', fontSize: '12px', textTransform: 'uppercase' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-1">In Stock</span>
                            <span className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums">
                                {isClient ? inventoryData.reduce((a: number, b: any) => a + b.value, 0).toLocaleString('id-ID') : "..."}
                            </span>
                        </div>
                    </div>
                    <div className="mt-12 space-y-4">
                        {inventoryData.map((item: any, i: number) => (
                            <div key={i} className="flex items-center justify-between group/item">
                                <div className="flex items-center gap-4">
                                    <div className="h-2 w-8 rounded-full transition-all group-hover/item:w-12 shadow-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{item.name}</span>
                                </div>
                                <span className="text-[13px] font-black text-slate-900 tabular-nums">{isClient ? item.value.toLocaleString() : "..."}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Activity Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10 pt-4">
                {/* Recent Activity Premium Feed */}
                <div className="erp-card p-10 bg-slate-50/30 border-slate-200/40">
                    <div className="flex items-center justify-between mb-10">
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Ledger Operations</h3>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Consolidated Transaction Feed</p>
                        </div>
                        <Link href="/finance" className="bg-white border-2 border-slate-100 hover:border-primary hover:text-primary px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm">Audit Trail</Link>
                    </div>
                    <div className="space-y-4">
                        {recentActivity.map((act: any, i: number) => (
                            <div key={i} className="flex items-center gap-6 p-5 rounded-[2rem] bg-white border border-slate-100/50 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 hover:border-slate-200 transition-all group/item">
                                <div className={cn(
                                    "p-4 rounded-2xl shadow-inner transition-transform group-hover/item:scale-110",
                                    act.type === 'SALE' ? 'bg-blue-50 text-blue-600 border border-blue-100/50' : 'bg-emerald-50 text-emerald-600 border border-emerald-100/50'
                                )}>
                                    {act.type === 'SALE' ? <ShoppingBag className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}
                                </div>
                                <div className="flex-1 min-w-0 space-y-1">
                                    <div className="text-[13px] font-black text-slate-900 uppercase tracking-tight truncate leading-none">{act.description}</div>
                                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">
                                        <span>{isClient && act.date ? new Date(act.date).toLocaleDateString('id-ID') : "-"}</span>
                                        <span className="h-1.5 w-1.5 rounded-full bg-slate-100" />
                                        <span>REF: {act.reference}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={cn(
                                        "text-base font-black tracking-tight tabular-nums",
                                        act.type === 'SALE' ? 'text-emerald-500' : 'text-slate-900'
                                    )}>
                                        {isClient ? (act.type === 'SALE' ? '+' : '-') + formatCurrency(act.amount) : "Rp ---"}
                                    </div>
                                    <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">Confirmed</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Logistics & Alerts Premium */}
                <div className="bg-slate-900 text-white rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group">
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-12">
                            <div className="space-y-1">
                                <h3 className="text-2xl font-black tracking-tight leading-none">Warehouse Vitals</h3>
                                <p className="text-slate-500 text-[11px] font-bold uppercase tracking-[0.3em]">Logistics & Stock Control</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md shadow-2xl">
                                <Package className="h-6 w-6 text-primary" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8 flex-1">
                            <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] transition-all hover:bg-white/[0.08] hover:border-white/20 hover:-translate-y-1">
                                <span className="text-[11px] font-black text-primary uppercase tracking-[0.3em] block mb-4">Traffic Today</span>
                                <div className="text-5xl font-black tracking-tighter tabular-nums mb-4">{activeOrdersToday}</div>
                                <div className="flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3 py-1.5 rounded-xl w-fit border border-emerald-500/20">
                                    <TrendingUp className="h-3 w-3" /> Growth Detected
                                </div>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] transition-all hover:bg-white/[0.08] hover:border-white/20 hover:-translate-y-1 flex flex-col justify-between">
                                <div>
                                    <span className="text-[11px] font-black text-rose-500 uppercase tracking-[0.3em] block mb-4">Risk Factors</span>
                                    <div className="text-5xl font-black tracking-tighter text-rose-500 tabular-nums mb-4">{lowStockCount}</div>
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-6">
                                        <div className="h-2 w-2 bg-rose-500 rounded-full animate-ping" />
                                        Refill Required
                                    </div>
                                </div>
                                
                                {lowStockProducts.length > 0 && (
                                    <div className="space-y-2 mt-auto">
                                        {lowStockProducts.slice(0, 3).map((p: any) => (
                                            <div key={p.id} className="flex items-center justify-between bg-white/5 p-2 rounded-xl border border-white/5">
                                                <div className="min-w-0">
                                                    <p className="text-[9px] font-black text-slate-500 truncate uppercase">{p.name}</p>
                                                    <p className="text-[8px] font-bold text-rose-400/60 uppercase tracking-tighter">Stock: {p.stock} / {p.threshold}</p>
                                                </div>
                                                <div className="h-1.5 w-1.5 bg-rose-500 rounded-full shrink-0 shadow-[0_0_5px_rgba(244,63,94,0.3)]" />
                                            </div>
                                        ))}
                                        {lowStockProducts.length > 3 && (
                                            <Link href="/tracking" className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline block text-center pt-1">+ {lowStockProducts.length - 3} More Items</Link>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-12 group/btn relative">
                            <div className="absolute -inset-1 rounded-[2.5rem] bg-gradient-to-r from-primary to-blue-600 opacity-40 blur transition duration-500 group-hover/btn:opacity-100 group-hover/btn:duration-200" />
                            <div className="relative flex items-center justify-between p-8 bg-primary rounded-[2.2rem] shadow-2xl transition-all hover:scale-[1.02] cursor-pointer active:scale-[0.98]">
                                <div className="space-y-1">
                                    <h4 className="font-black text-xl text-white tracking-tight leading-none uppercase">End-of-Month Audit</h4>
                                    <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em]">Module status: Finalized</p>
                                </div>
                                <div className="bg-white text-primary p-4 rounded-2xl shadow-2xl transform transition-transform group-hover/btn:rotate-12">
                                    <ArrowUpRight className="h-7 w-7" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full -mr-48 -mt-48 blur-[120px] transition-all duration-1000 group-hover:bg-primary/30" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full -ml-24 -mb-24 blur-[80px]" />
                </div>
            </div>
        </div>
    );

}
