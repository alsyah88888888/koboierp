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
    BarChart3
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
            {traceabilityData && (
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
            )}

            {/* ═══════ BUSINESS OVERVIEW — UNIFIED ═══════ */}
            <div className="erp-card overflow-hidden border-slate-200/50">
                <div className="bg-slate-900 text-white px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-black tracking-tight">Business Overview</h2>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Live Performance • Financial • Team • Stock</p>
                    </div>
                    <button onClick={handleExportExcel} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                        <FileSpreadsheet className="h-4 w-4" /><span>Export Report</span>
                    </button>
                </div>

                {/* Today Stats Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-slate-100">
                    {[
                        { icon: <ShoppingBag className="h-4 w-4 text-blue-500" />, label: 'Penjualan Hari Ini', value: formatCurrency(dailyStats.totalSales || 0), sub: `${dailyStats.countSales || 0} Invoice`, color: 'blue' },
                        { icon: <ShoppingCart className="h-4 w-4 text-emerald-500" />, label: 'Pembelian Hari Ini', value: formatCurrency(dailyStats.totalPurchases || 0), sub: `${dailyStats.countPurchases || 0} GR`, color: 'emerald' },
                        { icon: <Activity className="h-4 w-4 text-amber-500" />, label: 'Operasional', value: formatCurrency(dailyStats.totalOps || 0), sub: `${dailyStats.countOps || 0} Movement`, color: 'amber' },
                        { icon: <Package className="h-4 w-4 text-purple-500" />, label: 'Permintaan Barang', value: `${dailyStats.countRequests || 0} PRs`, sub: 'Pending', color: 'purple' }
                    ].map((item, i) => (
                        <div key={i} className={`p-5 ${i < 3 ? 'border-r border-slate-100' : ''} hover:bg-${item.color}-50/30 transition-colors`}>
                            <div className="flex items-center gap-2 mb-2">{item.icon}<span className={`text-[9px] font-black text-${item.color}-500 uppercase tracking-widest`}>{item.label}</span></div>
                            <p className="text-xl font-black text-slate-900 tracking-tighter tabular-nums">{isClient ? item.value : 'Rp ---'}</p>
                            <p className="text-[9px] font-bold text-slate-400 mt-0.5">{item.sub}</p>
                        </div>
                    ))}
                </div>

                {/* Financial KPIs Row */}
                <div className="flex flex-wrap border-b border-slate-100">
                    {stats.map((stat: any, i: number) => (
                        <div key={i} className="flex-1 min-w-[140px] p-4 border-r border-slate-100 last:border-r-0 hover:bg-slate-50/50 transition-colors">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate">{stat.name}</p>
                            <p className="text-base font-black text-slate-900 tracking-tighter tabular-nums leading-tight">{isClient ? stat.value : 'Rp ---'}</p>
                            <div className={`flex items-center gap-1 mt-1 text-[8px] font-black uppercase ${stat.trend === 'up' ? 'text-emerald-600' : 'text-rose-500'}`}>
                                {stat.trend === 'up' ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}{stat.change}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Chart + Team + Stock Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3">
                    {/* Weekly Chart */}
                    <div className="p-6 border-r border-b lg:border-b-0 border-slate-100">
                        <h3 className="text-sm font-black text-slate-900 mb-1">Weekly Velocity</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-4">Sales vs Purchase</p>
                        <div className="h-[180px]">
                            {isClient && (<ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={salesData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                                        <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 800 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 800 }} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '8px 12px', fontSize: '11px' }} />
                                    <Area type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#gS)" dot={false} />
                                    <Area type="monotone" dataKey="purchases" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#gP)" dot={false} />
                                </AreaChart>
                            </ResponsiveContainer>)}
                        </div>
                    </div>

                    {/* Team Profitability + Settlement */}
                    <div className="p-6 border-r border-b lg:border-b-0 border-slate-100 bg-slate-900 text-white">
                        <h3 className="text-sm font-black mb-1">Team Profitability</h3>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-4">Margin BC vs PF</p>
                        <div className="space-y-4">
                            {[{ n: 'BC', c: 'bg-blue-500' }, { n: 'PF', c: 'bg-purple-500' }].map(t => {
                                const v = Number((stats.find((s: any) => s.name === `Margin ${t.n}`)?.value || "0").toString().replace(/[^0-9,-]+/g, "").replace(",", "."));
                                const tot = Number((stats.find((s: any) => s.name === 'Total Revenue')?.value || "1").toString().replace(/[^0-9,-]+/g, "").replace(",", "."));
                                const p = Math.min(100, Math.abs(v / Math.max(1, tot)) * 100);
                                return (<div key={t.n} className="space-y-1.5">
                                    <div className="flex justify-between"><span className="text-[10px] font-black text-slate-400 uppercase">Team {t.n}</span><span className="text-sm font-black">{isClient ? stats.find((s: any) => s.name === `Margin ${t.n}`)?.value : '...'}</span></div>
                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden"><div className={`h-full ${t.c} rounded-full transition-all duration-1000`} style={{ width: `${isClient ? p : 0}%` }} /></div>
                                </div>);
                            })}
                        </div>
                        <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-2 gap-3">
                            <div><p className="text-[8px] font-bold text-slate-500 uppercase">Piutang</p><p className="text-sm font-black text-rose-400 tabular-nums">Rp {totalPiutangPending?.toLocaleString() || 0}</p></div>
                            <div><p className="text-[8px] font-bold text-slate-500 uppercase">Hutang</p><p className="text-sm font-black text-amber-400 tabular-nums">Rp {totalHutangPending?.toLocaleString() || 0}</p></div>
                        </div>
                    </div>

                    {/* Stock */}
                    <div className="p-6">
                        <h3 className="text-sm font-black text-slate-900 mb-1">Stock Integrity</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">By Category</p>
                        <div className="relative h-[140px] mb-3">
                            {isClient && (<ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={inventoryData} cx="50%" cy="50%" innerRadius={42} outerRadius={60} paddingAngle={5} dataKey="value" stroke="none">{inventoryData.map((_: any, idx: number) => (<Cell key={idx} fill={COLORS[idx % COLORS.length]} />))}</Pie></PieChart></ResponsiveContainer>)}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-[8px] font-black text-slate-300 uppercase">Total</span>
                                <span className="text-lg font-black text-slate-900 tabular-nums">{isClient ? inventoryData.reduce((a: number, b: any) => a + b.value, 0).toLocaleString('id-ID') : '...'}</span>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            {inventoryData.map((item: any, i: number) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2"><div className="h-2 w-4 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} /><span className="text-[10px] font-bold text-slate-500">{item.name}</span></div>
                                    <span className="text-[10px] font-black text-slate-900 tabular-nums">{isClient ? item.value.toLocaleString() : '...'}</span>
                                </div>
                            ))}
                        </div>
                        {lowStockCount > 0 && (<div className="mt-3 p-2.5 bg-rose-50 rounded-lg border border-rose-100 flex items-center gap-2 text-[9px] font-black text-rose-600 uppercase tracking-widest"><div className="h-2 w-2 bg-rose-500 rounded-full animate-ping" />{lowStockCount} Low Stock</div>)}
                    </div>
                </div>
            </div>

            {/* ═══════ TRACEABILITY REPORT — EXCEL STYLE ═══════ */}
            {traceabilityData && (
            <div className="space-y-6 pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                    <div className="flex items-center gap-4">
                        <div className="h-5 w-2 bg-gradient-to-b from-cyan-500 to-blue-600 rounded-full shadow-lg shadow-cyan-200" />
                        <div>
                            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Traceability Report</h2>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Pergerakan Barang &amp; Status PO (30 Hari)</p>
                        </div>
                    </div>
                    <button onClick={() => {
                        const wb = XLSX.utils.book_new();
                        const rows = (traceabilityData.movements || []).map((mv: any, i: number) => ({
                            'No': i + 1,
                            'Tanggal': mv.date ? new Date(mv.date).toLocaleDateString('id-ID') : '-',
                            'No. Dokumen': mv.ref,
                            'Tipe': mv.type === 'IN' ? 'MASUK' : 'KELUAR',
                            'Partner': mv.partner,
                            'Qty': mv.qty,
                            'Total (Rp)': mv.amount,
                            'Status Bayar': mv.paymentStatus || '-'
                        }));
                        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Pergerakan Barang');
                        const poRows = [...(traceabilityData.poSummary?.openOrders || []), ...(traceabilityData.poSummary?.partialOrders || [])].map((po: any) => ({
                            'No. PO': po.orderNumber, 'Buyer': po.buyerName, 'Total Qty': po.totalQty, 'Terkirim': po.shippedQty, 'Progress': `${Math.round((po.shippedQty / Math.max(1, po.totalQty)) * 100)}%`
                        }));
                        if (poRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(poRows), 'PO Belum Close');
                        XLSX.writeFile(wb, `Traceability_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
                    }} className="erp-btn-primary !bg-emerald-600 hover:!bg-emerald-700 !px-5 !py-2.5 shadow-emerald-200 text-xs">
                        <FileSpreadsheet className="h-4 w-4" />
                        <span>Export Excel</span>
                    </button>
                </div>
                {/* Volume Flow Banner */}
                <div className="erp-card bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.08),transparent_70%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(16,185,129,0.08),transparent_70%)]" />
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="text-center md:text-left flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="h-2 w-2 bg-emerald-400 rounded-full animate-pulse" />
                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Inbound</span>
                            </div>
                            <p className="text-4xl font-black tracking-tighter tabular-nums">{isClient ? (traceabilityData.volume?.purchaseQty || 0).toLocaleString('id-ID') : '...'}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Units Purchased</p>
                        </div>
                        <div className="flex items-center gap-3 px-8">
                            <div className="h-px w-12 bg-slate-700" />
                            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                                <ArrowRight className="h-5 w-5 text-slate-400" />
                            </div>
                            <div className="h-px w-12 bg-slate-700" />
                        </div>
                        <div className="text-center md:text-right flex-1">
                            <div className="flex items-center gap-2 mb-2 justify-center md:justify-end">
                                <div className="h-2 w-2 bg-blue-400 rounded-full animate-pulse" />
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Outbound</span>
                            </div>
                            <p className="text-4xl font-black tracking-tighter tabular-nums">{isClient ? (traceabilityData.volume?.salesQty || 0).toLocaleString('id-ID') : '...'}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Units Sold</p>
                        </div>
                    </div>
                </div>

                {/* Excel-Style Goods Movement Table */}
                <div className="erp-card overflow-hidden border-slate-200/60">
                    <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center justify-between">
                        <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Pergerakan Barang (Inbound / Outbound)</span>
                        <Link href="/tracking" className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">Lihat Semua</Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-[11px]">
                            <thead>
                                <tr className="bg-slate-900 text-white">
                                    <th className="px-4 py-3 text-left font-black uppercase tracking-wider w-10">No</th>
                                    <th className="px-4 py-3 text-left font-black uppercase tracking-wider">Tanggal</th>
                                    <th className="px-4 py-3 text-left font-black uppercase tracking-wider">No. Dokumen</th>
                                    <th className="px-4 py-3 text-center font-black uppercase tracking-wider w-20">Tipe</th>
                                    <th className="px-4 py-3 text-left font-black uppercase tracking-wider">Partner</th>
                                    <th className="px-4 py-3 text-right font-black uppercase tracking-wider w-16">Qty</th>
                                    <th className="px-4 py-3 text-right font-black uppercase tracking-wider">Total (Rp)</th>
                                    <th className="px-4 py-3 text-center font-black uppercase tracking-wider w-24">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(traceabilityData.movements || []).map((mv: any, i: number) => (
                                    <tr key={i} className={`border-b border-slate-100 hover:bg-blue-50/40 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                        <td className="px-4 py-2.5 font-bold text-slate-400 tabular-nums">{i + 1}</td>
                                        <td className="px-4 py-2.5 font-bold text-slate-700 tabular-nums whitespace-nowrap">{isClient && mv.date ? new Date(mv.date).toLocaleDateString('id-ID') : '-'}</td>
                                        <td className="px-4 py-2.5 font-black text-slate-900 tracking-tight">{mv.ref}</td>
                                        <td className="px-4 py-2.5 text-center">
                                            <span className={`inline-block px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${
                                                mv.type === 'IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                                            }`}>{mv.type === 'IN' ? '↓ MASUK' : '↑ KELUAR'}</span>
                                        </td>
                                        <td className="px-4 py-2.5 font-bold text-slate-700 truncate max-w-[200px]">{mv.partner}</td>
                                        <td className="px-4 py-2.5 text-right font-black text-slate-900 tabular-nums">{(mv.qty || 0).toLocaleString('id-ID')}</td>
                                        <td className="px-4 py-2.5 text-right font-black text-slate-900 tabular-nums whitespace-nowrap">{isClient ? (mv.amount || 0).toLocaleString('id-ID') : '...'}</td>
                                        <td className="px-4 py-2.5 text-center">
                                            <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                                mv.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                                                mv.paymentStatus === 'CREDIT' ? 'bg-amber-100 text-amber-700' :
                                                mv.paymentStatus === 'PARTIAL' ? 'bg-orange-100 text-orange-700' :
                                                'bg-slate-100 text-slate-500'
                                            }`}>{mv.paymentStatus || 'PENDING'}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                {/* Top Partners Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="erp-card overflow-hidden">
                        <div className="bg-emerald-50 px-6 py-3 border-b border-emerald-100">
                            <span className="text-[11px] font-black text-emerald-700 uppercase tracking-widest">Top 5 Supplier (30 Hari)</span>
                        </div>
                        <table className="w-full text-[11px]">
                            <tbody>
                                {(traceabilityData.topSuppliers || []).map((s: any, i: number) => (
                                    <tr key={i} className={`border-b border-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                        <td className="px-4 py-2.5 font-black text-emerald-600 w-8">{i + 1}</td>
                                        <td className="px-4 py-2.5 font-bold text-slate-900 truncate">{s.name}</td>
                                        <td className="px-4 py-2.5 text-right font-bold text-slate-500 tabular-nums">{s.count}x transaksi</td>
                                        <td className="px-4 py-2.5 text-right font-black text-slate-900 tabular-nums whitespace-nowrap">Rp {(s.total || 0).toLocaleString('id-ID')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="erp-card overflow-hidden">
                        <div className="bg-blue-50 px-6 py-3 border-b border-blue-100">
                            <span className="text-[11px] font-black text-blue-700 uppercase tracking-widest">Top 5 Buyer (30 Hari)</span>
                        </div>
                        <table className="w-full text-[11px]">
                            <tbody>
                                {(traceabilityData.topBuyers || []).map((b: any, i: number) => (
                                    <tr key={i} className={`border-b border-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                        <td className="px-4 py-2.5 font-black text-blue-600 w-8">{i + 1}</td>
                                        <td className="px-4 py-2.5 font-bold text-slate-900 truncate">{b.name}</td>
                                        <td className="px-4 py-2.5 text-right font-bold text-slate-500 tabular-nums">{b.count}x transaksi</td>
                                        <td className="px-4 py-2.5 text-right font-black text-slate-900 tabular-nums whitespace-nowrap">Rp {(b.total || 0).toLocaleString('id-ID')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            )}

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
                                        <span className={cn(
                                            "capitalize px-2 py-0.5 rounded-md",
                                            act.type === 'SALE' ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-500'
                                        )}>{act.type.toLowerCase()}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-black text-slate-900 font-mono">
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
