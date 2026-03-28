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
    FileSpreadsheet
} from "lucide-react";
import * as XLSX from 'xlsx';
import { formatCurrency, cn } from "@/lib/utils";
import { RoleGuideline } from "@/components/RoleGuideline";

const COLORS = ['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const IconMap: any = {
    ShoppingBag,
    Wallet,
    ShoppingCart,
    Package,
    TrendingUp
};

export function AdminDashboard({ role, stats, salesData, inventoryData, recentActivity, lowStockCount, activeOrdersToday, dailyReport }: any) {
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
            "Buyer": s.buyerName,
            "Penerima": s.recipient,
            "Total": Number(s.grandTotal),
            "Status": s.paymentStatus,
            "Waktu Input": new Date(s.createdAt).toLocaleString('id-ID'),
            "Operator": s.createdBy?.name || "System",
            "Tgl Transaksi": new Date(s.date).toLocaleDateString('id-ID')
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
        <div key={i} className="group relative overflow-hidden rounded-[2rem] border border-white/20 bg-white/40 p-5 md:p-6 backdrop-blur-xl transition-all hover:bg-white/60 hover:shadow-2xl hover:shadow-slate-200/50">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-slate-900/5 blur-3xl transition-all group-hover:scale-150 group-hover:bg-primary/10" />
            <div className="relative flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-4">
                    <div className={cn(stat.iconBg, "p-3 rounded-2xl shadow-inner")}>
                        {(() => {
                            const Icon = IconMap[stat.iconName] || Package;
                            return <Icon className={stat.iconColor + " h-5 w-5"} />;
                        })()}
                    </div>
                    <div className={cn(
                        "flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter",
                        stat.trend === 'up' ? 'text-emerald-700 bg-emerald-100/50' : 'text-rose-700 bg-rose-100/50'
                    )}>
                        {stat.trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {stat.change}
                    </div>
                </div>
                <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">{stat.name}</p>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">{stat.value}</h3>
                </div>
            </div>
        </div>
    );
    return (
        <div className="space-y-6 md:space-y-10 pb-12 animate-in fade-in duration-700">
            {/* Role-Specific SOP Guideline */}
            <RoleGuideline role={role} />

            {/* Today's High-Level Activity */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                    <div className="flex items-center gap-2">
                        <div className="h-4 w-1.5 bg-primary rounded-full" />
                        <div>
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Live Today</h2>
                            <p className="text-[10px] font-bold text-slate-400 capitalize">Realisasi transaksi hari ini</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleExportExcel}
                        className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-200 active:scale-95 w-full sm:w-auto"
                    >
                        <FileSpreadsheet className="h-4 w-4" />
                        Download Report
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {/* Today's Sales */}
                    <div className="bg-white border-2 border-blue-100 rounded-[2rem] p-6 shadow-sm relative overflow-hidden group hover:border-blue-500 transition-all">
                        <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <ShoppingBag className="h-20 w-20 text-blue-600" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                                    <ShoppingBag className="h-5 w-5" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest">Input Hari Ini</span>
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-2xl font-black text-slate-900 leading-none">{formatCurrency(dailyStats.totalSales || 0)}</h4>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{dailyStats.countSales || 0} Data Terproses</p>
                            </div>
                        </div>
                    </div>

                    {/* Today's Purchases */}
                    <div className="bg-white border-2 border-emerald-100 rounded-[2rem] p-6 shadow-sm relative overflow-hidden group hover:border-emerald-500 transition-all">
                        <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <ShoppingCart className="h-20 w-20 text-emerald-600" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                                    <ShoppingCart className="h-5 w-5" />
                                </div>
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Pembelian (Input Hari Ini)</span>
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-2xl font-black text-slate-900 leading-none">{formatCurrency(dailyStats.totalPurchases || 0)}</h4>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{dailyStats.countPurchases || 0} Nota Masuk</p>
                            </div>
                        </div>
                    </div>

                    {/* Today's Ops */}
                    <div className="bg-white border-2 border-amber-100 rounded-[2rem] p-6 shadow-sm relative overflow-hidden group hover:border-amber-500 transition-all">
                        <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Wallet className="h-20 w-20 text-amber-600" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                                    <Activity className="h-5 w-5" />
                                </div>
                                <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Ops & Finance (Input Hari Ini)</span>
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-2xl font-black text-slate-900 leading-none">{formatCurrency(dailyStats.totalOps || 0)}</h4>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{dailyStats.countOps || 0} Transaksi Kas</p>
                            </div>
                        </div>
                    </div>

                    {/* Today's PR */}
                    <div className="bg-white border-2 border-purple-100 rounded-[2rem] p-6 shadow-sm relative overflow-hidden group hover:border-purple-500 transition-all">
                        <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Package className="h-20 w-20 text-purple-600" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
                                    <Package className="h-5 w-5" />
                                </div>
                                <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Permintaan (Input Hari Ini)</span>
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-2xl font-black text-slate-900 leading-none">{dailyStats.countRequests || 0} PR</h4>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pengajuan Barang Baru</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Live Input Diary (Activity Stream) */}
                <div className="bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-white rounded-xl shadow-sm">
                            <Activity className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Live Input Diary</h3>
                            <p className="text-[10px] font-bold text-slate-400 capitalize">Arus aktivitas penginputan data hari ini</p>
                        </div>
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
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
                                    <div className="text-center py-10">
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Belum ada aktivitas input hari ini</p>
                                    </div>
                                );
                            }

                            return activities.map((act: any, idx: number) => (
                            <div key={idx} className="bg-white p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:shadow-md transition-all border border-transparent hover:border-slate-200">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2.5 rounded-xl shrink-0 ${
                                        act.activityType === 'SALE' ? 'bg-blue-50 text-blue-600' :
                                        act.activityType === 'PURCHASE' ? 'bg-emerald-50 text-emerald-600' :
                                        act.activityType === 'FINANCE' ? 'bg-amber-50 text-amber-600' :
                                        'bg-purple-50 text-purple-600'
                                    }`}>
                                        {act.activityType === 'SALE' && <ShoppingBag className="h-4 w-4" />}
                                        {act.activityType === 'PURCHASE' && <ShoppingCart className="h-4 w-4" />}
                                        {act.activityType === 'FINANCE' && <Wallet className="h-4 w-4" />}
                                        {act.activityType === 'REQUEST' && <Package className="h-4 w-4" />}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[11px] font-black text-slate-900 truncate">
                                                {act.deliveryNumber || act.receiptNumber || act.number || act.description}
                                            </span>
                                            <span className="text-[9px] font-bold text-slate-300">•</span>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                {isClient ? new Date(act.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                                            </span>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-500 truncate">
                                            {act.activityType === 'SALE' ? `Penjualan ke ${act.buyerName || '-'}` :
                                             act.activityType === 'PURCHASE' ? `Penerimaan dari ${act.receivedFrom || '-'}` :
                                             act.activityType === 'REQUEST' ? `Permintaan: ${act.notes || 'Tanpa Catatan'}` :
                                             `Transaksi ${act.category || 'Lain-lain'}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-left sm:text-right border-t sm:border-0 pt-3 sm:pt-0">
                                    <div className="text-[10px] font-black text-slate-900 uppercase">
                                        {act.createdBy?.name || act.requestedBy?.name || "System"}
                                    </div>
                                    <div className={`text-[9px] font-black uppercase tracking-widest ${
                                        act.activityType === 'SALE' ? 'text-blue-500' :
                                        act.activityType === 'PURCHASE' ? 'text-emerald-500' :
                                        act.activityType === 'FINANCE' ? 'text-amber-500' :
                                        'text-purple-500'
                                    }`}>
                                        {act.activityType}
                                    </div>
                                </div>
                            </div>
                        ));
                    })()}
                    </div>
                </div>
            </div>

            {/* Financial Health Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                    <div className="h-3 w-1 bg-primary rounded-full" />
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Financial Overview</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {financialStats.map(renderStatCard)}
                </div>
            </div>

            {/* Performance & Liabilites Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                        <div className="h-3 w-1 bg-amber-500 rounded-full" />
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Team Performance</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {performanceStats.map(renderStatCard)}
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                        <div className="h-3 w-1 bg-rose-500 rounded-full" />
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Liabilities & Credit</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {liabilityStats.map(renderStatCard)}
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                {/* Sales Area Chart */}
                <div className="lg:col-span-2 bg-white border-2 border-slate-200 rounded-2xl md:rounded-[2.5rem] p-4 md:p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-slate-900">Weekly Operations</h3>
                            <p className="text-slate-500 text-sm font-medium">Transaction volume by module</p>
                        </div>
                        <select className="bg-slate-50 border-2 border-slate-100 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 outline-none">
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                        </select>
                    </div>
                    <div className="h-[300px] w-full">
                        {isClient && (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorPurch" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                                    />
                                    <Area type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                    <Area type="monotone" dataKey="purchases" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPurch)" dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Inventory Pie Chart */}
                <div className="bg-white/40 border border-white/20 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-sm flex flex-col group transition-all hover:bg-white/60">
                    <div className="mb-6">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Inventory Distribution</h3>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Stock Category Share</p>
                    </div>
                    <div className="flex-1 h-[240px] relative">
                        {isClient && (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={inventoryData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={75}
                                        outerRadius={95}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {inventoryData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '12px 16px' }}
                                        itemStyle={{ fontWeight: '900', fontSize: '12px', textTransform: 'uppercase' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Total</span>
                            <span className="text-3xl font-black text-slate-900 leading-none">
                                {inventoryData.reduce((a: number, b: any) => a + b.value, 0).toLocaleString()}
                            </span>
                        </div>
                    </div>
                    <div className="mt-8 space-y-2.5">
                        {inventoryData.map((item: any, i: number) => (
                            <div key={i} className="flex items-center justify-between group/item">
                                <div className="flex items-center gap-3">
                                    <div className="h-2 w-6 rounded-full transition-all group-hover/item:w-8" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-tighter">{item.name}</span>
                                </div>
                                <span className="text-xs font-black text-slate-900">{item.value.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Section: Recent Activity & Low Stock */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                {/* Recent Activity Premium Feed */}
                <div className="bg-white/40 border border-white/20 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-sm group transition-all hover:bg-white/60">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Latest Operations</h3>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Real-time Activity Stream</p>
                        </div>
                        <a href="/finance" className="bg-slate-100/50 hover:bg-primary hover:text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">View All</a>
                    </div>
                    <div className="space-y-4">
                        {recentActivity.map((act: any, i: number) => (
                            <div key={i} className="flex items-center gap-5 p-4 rounded-3xl hover:bg-white/80 border border-transparent hover:border-white/50 transition-all group/item shadow-sm hover:shadow-xl hover:shadow-slate-200/50">
                                <div className={cn(
                                    "p-3.5 rounded-2xl shadow-inner transition-transform group-hover/item:scale-110",
                                    act.type === 'SALE' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                                )}>
                                    {act.type === 'SALE' ? <ShoppingBag className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-black text-slate-900 uppercase tracking-tight truncate mb-0.5">{act.description}</div>
                                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                        <span>{act.date}</span>
                                        <span className="h-1 w-1 rounded-full bg-slate-200" />
                                        <span>{act.reference}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={cn(
                                        "text-sm font-black tracking-tight",
                                        act.type === 'SALE' ? 'text-emerald-500' : 'text-slate-900'
                                    )}>
                                        {act.type === 'SALE' ? '+' : '-'}{formatCurrency(act.amount)}
                                    </div>
                                    <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-0.5">Verified</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Logistics Summary Premium */}
                <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h3 className="text-xl font-black tracking-tight">Logistics Overview</h3>
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Warehouse Health & Activity</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
                                <Package className="h-5 w-5 text-primary-light" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 flex-1">
                            <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] transition-all hover:bg-white/[0.08] hover:border-white/20">
                                <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] block mb-2">Orders Today</span>
                                <div className="text-4xl font-black tracking-tighter">{activeOrdersToday}</div>
                                <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase tracking-tighter bg-emerald-400/10 px-2 py-1 rounded-lg w-fit">
                                    <TrendingUp className="h-3 w-3" /> Live Update
                                </div>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] transition-all hover:bg-white/[0.08] hover:border-white/20">
                                <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] block mb-2">Low Stock Alerts</span>
                                <div className="text-4xl font-black tracking-tighter text-rose-500">{lowStockCount}</div>
                                <div className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                    Requires Attention
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 group/btn relative">
                            <div className="absolute -inset-1 rounded-[2.2rem] bg-gradient-to-r from-primary to-blue-600 opacity-30 blur transition group-hover/btn:opacity-60" />
                            <div className="relative flex items-center justify-between p-6 bg-primary rounded-[2rem] shadow-xl transition-transform hover:scale-[1.02] cursor-pointer active:scale-[0.98]">
                                <div>
                                    <h4 className="font-black text-lg text-white tracking-tight">Generate Month-End Report</h4>
                                    <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mt-1">Ready for Feb 2026</p>
                                </div>
                                <div className="bg-white text-primary p-3 rounded-2xl shadow-lg">
                                    <ArrowUpRight className="h-6 w-6" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full -mr-32 -mt-32 blur-[100px] animate-pulse" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full -ml-16 -mb-16 blur-[60px]" />
                </div>
            </div>
        </div>
    );
}
