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

        // 1. Sales Tab
        const salesRows = sales.map((s: any) => ({
            "Bulan": new Date(s.date).toLocaleString('id-ID', { month: 'long' }),
            "Tgl Transaksi": new Date(s.date).toLocaleDateString('id-ID'),
            "No. Transaksi": s.deliveryNumber,
            "PO BUYER": s.poNumber || "-",
            "Buyer": s.buyerName,
            "Penerima": s.recipient,
            "Total": Number(s.grandTotal),
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

            {/* ═══════ TRACEABILITY REPORT — PREMIUM UNIFIED FLOW ═══════ */}
            {traceabilityData && (
            <div className="space-y-8 pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-4">
                    <div className="flex items-center gap-5">
                        <div className="h-12 w-1.5 bg-gradient-to-b from-blue-600 via-indigo-500 to-emerald-500 rounded-full shadow-lg shadow-blue-200/50" />
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Traceability Stream</h2>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1.5">Unified Logistics & Financial Flow (30 Days)</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/tracking" className="px-5 py-2.5 bg-white border border-slate-200 hover:border-primary hover:text-primary rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm">
                            View Logistics
                        </Link>
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

                            const detailedRows = (traceabilityData.recentDetailed || []).map((row: any) => ({
                                'Tgl Beli': row['Tgl Beli'],
                                'No. Lot / Batch': row['No. Lot'],
                                'Supplier': row['Supplier'],
                                'Tgl Jual': row['Tgl Jual'],
                                'No. SJ': row['No. SJ'],
                                'Buyer': row['Buyer'],
                                'SKU': row['SKU'],
                                'Nama Barang': row['Nama Barang'],
                                'Qty': row['QTY'],
                                'Harga Beli (Unit)': row['HPP Per Unit (Rp)'],
                                'Harga Jual (Unit)': row['Harga Jual Per Unit (Rp)'],
                                'Total Profit': row['Total Profit (Rp)'],
                                'Margin': row['Margin %'],
                                'Status': row['Status']
                            }));
                            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailedRows), 'Traceability Detail');

                            XLSX.writeFile(wb, `Traceability_Stream_${new Date().toISOString().split('T')[0]}.xlsx`);
                        }} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-200">
                            <FileSpreadsheet className="h-4 w-4" /><span>Export Stream</span>
                        </button>
                    </div>
                </div>

                {/* Volume Flow Stats Banner — FULL WIDTH */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-3 erp-card bg-slate-900 text-white p-10 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.15),transparent_70%)]" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(16,185,129,0.15),transparent_70%)]" />
                        
                        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-12">
                            <div className="text-center sm:text-left flex-1">
                                <div className="flex items-center gap-3 mb-4 justify-center sm:justify-start">
                                    <div className="h-2.5 w-2.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                                    <span className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.2em]">Inbound Logistics</span>
                                </div>
                                <p className="text-6xl font-black tracking-tighter tabular-nums mb-2">{isClient ? (traceabilityData.volume?.purchaseQty || 0).toLocaleString('id-ID') : '...'}</p>
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.3em]">Total Units Received</p>
                            </div>
                            
                            <div className="flex flex-col items-center gap-4 py-4">
                                <div className="p-6 bg-white/5 border border-white/10 rounded-[2rem] backdrop-blur-xl group-hover:scale-110 transition-transform shadow-2xl">
                                    <RefreshCw className="h-8 w-8 text-slate-400 animate-[spin_12s_linear_infinite]" />
                                </div>
                                <div className="h-px w-32 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
                            </div>
 
                            <div className="text-center sm:text-right flex-1">
                                <div className="flex items-center gap-3 mb-4 justify-center sm:justify-end">
                                    <div className="h-2.5 w-2.5 bg-blue-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(96,165,250,0.5)]" />
                                    <span className="text-[11px] font-black text-blue-400 uppercase tracking-[0.2em]">Outbound Distribution</span>
                                </div>
                                <p className="text-6xl font-black tracking-tighter tabular-nums mb-2">{isClient ? (traceabilityData.volume?.salesQty || 0).toLocaleString('id-ID') : '...'}</p>
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.3em]">Total Units Delivered</p>
                            </div>
                        </div>
                    </div>

                    <div className="erp-card p-10 border-slate-200 bg-white flex flex-col justify-center shadow-xl shadow-slate-100">
                        <div className="space-y-8">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Traffic Today</p>
                                    <span className="text-4xl font-black text-blue-600 tabular-nums leading-none tracking-tighter">{activeOrdersToday}</span>
                                </div>
                                <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                                    <Activity className="h-6 w-6 text-blue-600" />
                                </div>
                            </div>
                            <div className="h-px bg-slate-100" />
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                                    <ShieldCheck className="h-5 w-5 text-emerald-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-900 uppercase">Operational Status</p>
                                    <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">100% Verified</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
 
                {/* Unified Batch Traceability — FULL WIDTH TABLE */}
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
                                        <th className="px-4 py-4 text-center font-black uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(traceabilityData.recentDetailed || []).map((row: any, i: number) => {
                                        const marginNum = parseFloat(row['Margin %']);
                                        return (
                                            <tr key={i} className={`hover:bg-blue-50/50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}`}>
                                                <td className="px-4 py-3 font-bold text-slate-500 whitespace-nowrap">{row['Tgl Beli']}</td>
                                                <td className="px-4 py-3 font-black text-slate-900 whitespace-nowrap tracking-tight">{row['No. Lot']}</td>
                                                <td className="px-4 py-3 font-bold text-slate-700 truncate max-w-[150px]">{row['Supplier']}</td>
                                                <td className="px-4 py-3 font-bold text-slate-500 whitespace-nowrap text-blue-600">{row['Tgl Jual']}</td>
                                                <td className="px-4 py-3 font-black text-slate-900 whitespace-nowrap tracking-tight">{row['No. SJ']}</td>
                                                <td className="px-4 py-3 font-bold text-slate-700 truncate max-w-[150px]">{row['Buyer']}</td>
                                                <td className="px-4 py-3">
                                                    <p className="font-black text-slate-900 leading-none mb-1">{row['SKU']}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[200px]">{row['Nama Barang']}</p>
                                                </td>
                                                <td className="px-4 py-3 text-right font-black text-slate-900 tabular-nums">{row['QTY']}</td>
                                                <td className="px-4 py-3 text-right font-black text-slate-500 whitespace-nowrap tabular-nums">{formatCurrency(row['HPP Per Unit (Rp)'])}</td>
                                                <td className="px-4 py-3 text-right font-black text-slate-900 whitespace-nowrap tabular-nums">{formatCurrency(row['Harga Jual Per Unit (Rp)'])}</td>
                                                <td className={`px-4 py-3 text-right font-black whitespace-nowrap tabular-nums ${row['Total Profit (Rp)'] >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {formatCurrency(row['Total Profit (Rp)'])}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2.5 py-1 rounded-lg font-black text-[10px] ${
                                                        marginNum > 20 ? 'bg-emerald-100 text-emerald-700' :
                                                        marginNum > 10 ? 'bg-blue-100 text-blue-700' :
                                                        marginNum > 0 ? 'bg-amber-100 text-amber-700' :
                                                        'bg-rose-100 text-rose-700'
                                                    }`}>
                                                        {row['Margin %']}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-tighter ${
                                                        row['Status'] === 'TERJUAL (LOT)' ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                        {row['Status']}
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
            )}
 
            {/* ═══════ CONSOLIDATED OPERATIONAL INSIGHTS — BOTTOM SECTION ═══════ */}
            <div className="space-y-8 md:space-y-12">
                <div className="flex items-center gap-4 px-4">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] whitespace-nowrap">Operational Intelligence Center</span>
                    <div className="h-px flex-1 bg-slate-200" />
                </div>
 
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 md:gap-12">
                    {/* Recent Ledger Operations */}
                    <div className="erp-card p-10 bg-white border-slate-200 shadow-xl shadow-slate-100/60">
                        <div className="flex items-center justify-between mb-10">
                            <div className="space-y-1">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Ledger Ops</h3>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Real-time Financial Flow</p>
                            </div>
                            <Link href="/finance" className="bg-slate-50 hover:bg-slate-900 hover:text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Full Ledger</Link>
                        </div>
                        <div className="space-y-4">
                            {recentActivity.slice(0, 5).map((act: any, i: number) => (
                                <div key={i} className="flex items-center gap-5 p-5 rounded-3xl bg-slate-50/50 border border-slate-100/50 hover:bg-white hover:shadow-xl hover:border-slate-200 transition-all group/item">
                                    <div className={cn(
                                        "h-12 w-12 rounded-2xl flex items-center justify-center transition-transform group-hover/item:scale-110",
                                        act.type === 'SALE' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
                                    )}>
                                        {act.type === 'SALE' ? <ShoppingBag className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[12px] font-black text-slate-900 uppercase truncate leading-none mb-1.5">{act.description}</div>
                                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isClient ? new Date(act.date).toLocaleDateString('id-ID') : '-'}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-black text-slate-900 font-mono tracking-tighter">
                                            {isClient ? (act.type === 'SALE' ? '+' : '-') + formatCurrency(act.amount) : "Rp ---"}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
 
                    {/* Warehouse Vitals & Stock Risks */}
                    <div className="bg-slate-900 text-white rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group">
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex items-center justify-between mb-10">
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-black tracking-tighter uppercase">Logistics Hub</h3>
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Warehouse Vitals</p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl">
                                    <Package className="h-6 w-6 text-primary" />
                                </div>
                            </div>
 
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
                                <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem]">
                                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] block mb-4">Stock Risks</span>
                                    <div className="text-6xl font-black tracking-tighter text-rose-500 mb-2 tabular-nums">{lowStockCount}</div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Items Below Threshold</p>
                                </div>
                                
                                <div className="space-y-3">
                                    {lowStockProducts.slice(0, 4).map((p: any) => (
                                        <div key={p.id} className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black text-slate-200 truncate uppercase leading-none mb-1">{p.name}</p>
                                                <p className="text-[8px] font-bold text-slate-500 uppercase">Qty: {p.stock} Units</p>
                                            </div>
                                            <div className="h-2 w-2 bg-rose-500 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
                                        </div>
                                    ))}
                                </div>
                            </div>
 
                            <Link href="/warehouse" className="mt-8 flex items-center justify-between p-6 bg-primary rounded-[2rem] hover:scale-[1.02] transition-all">
                                <span className="font-black text-sm uppercase tracking-widest">Audit Warehouse</span>
                                <ArrowUpRight className="h-5 w-5" />
                            </Link>
                        </div>
                    </div>
                </div>
 
                {/* Partners & Market Insights */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Top Suppliers */}
                    <div className="erp-card overflow-hidden border-slate-200 bg-white">
                        <div className="bg-slate-900 text-white px-8 py-5 flex items-center justify-between">
                            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Supply Chain</span>
                            <ShoppingCart className="h-4 w-4 text-emerald-400" />
                        </div>
                        <div className="p-4 space-y-1">
                            {(traceabilityData?.topSuppliers || []).map((s: any, i: number) => (
                                <div key={i} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-xl bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">{i + 1}</div>
                                        <p className="text-[11px] font-black text-slate-900 uppercase truncate max-w-[150px]">{s.name}</p>
                                    </div>
                                    <p className="text-[11px] font-black text-slate-900 tabular-nums">{formatCurrency(s.total)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
 
                    {/* Top Buyers */}
                    <div className="erp-card overflow-hidden border-slate-200 bg-white">
                        <div className="bg-slate-900 text-white px-8 py-5 flex items-center justify-between">
                            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Distribution</span>
                            <ShoppingBag className="h-4 w-4 text-blue-400" />
                        </div>
                        <div className="p-4 space-y-1">
                            {(traceabilityData?.topBuyers || []).map((b: any, i: number) => (
                                <div key={i} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">{i + 1}</div>
                                        <p className="text-[11px] font-black text-slate-900 uppercase truncate max-w-[150px]">{b.name}</p>
                                    </div>
                                    <p className="text-[11px] font-black text-slate-900 tabular-nums">{formatCurrency(b.total)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
 
                    {/* Market Velocity & Inventory Health */}
                    <div className="space-y-8">
                        <div className="erp-card p-8 bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-700 text-white relative overflow-hidden h-[45%] flex flex-col justify-center">
                            <div className="relative z-10">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-4">Market Velocity</p>
                                <div className="flex items-end justify-between">
                                    <div>
                                        <h3 className="text-4xl font-black tracking-tighter leading-none mb-2">
                                            {isClient ? Math.round(((traceabilityData?.volume?.salesQty || 0) / Math.max(1, (traceabilityData?.volume?.purchaseQty || 0) + (traceabilityData?.volume?.salesQty || 0))) * 100) : '0'}%
                                        </h3>
                                        <p className="text-[9px] font-bold uppercase tracking-widest opacity-80">Inventory Liquidity Index</p>
                                    </div>
                                    <TrendingUp className="h-10 w-10 opacity-30" />
                                </div>
                            </div>
                        </div>

                        <div className="erp-card p-8 bg-emerald-50 border-emerald-200 h-[45%] flex items-center gap-6">
                            <div className="h-16 w-16 rounded-[2rem] bg-emerald-600 text-white flex items-center justify-center shadow-xl shadow-emerald-200">
                                <ShieldCheck className="h-8 w-8" />
                            </div>
                            <div>
                                <h4 className="text-lg font-black text-emerald-900 tracking-tight leading-none mb-1">Operational Health</h4>
                                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">100% Data Integrity Verified</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
