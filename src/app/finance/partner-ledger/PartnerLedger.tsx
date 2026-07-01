"use client";
import { useState, useMemo } from "react";
import { format, differenceInDays, addDays } from "date-fns";
import {
    AlertTriangle, CheckCircle2, Clock, Search, ChevronRight,
    ChevronDown, ArrowUpCircle, ArrowDownCircle, X, Download,
    RotateCcw, ShoppingCart, AlertCircle
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { exportToExcel } from "@/lib/excel";

const DUE_DAYS = 30;

function getAgingStatus(date: string | Date, paymentStatus: string, paidAmount: number, grandTotal: number) {
    const remaining = grandTotal - paidAmount;
    if (paymentStatus === "PAID" || remaining <= 0) return "PAID";
    const dueDate = addDays(new Date(date), DUE_DAYS);
    const today = new Date();
    const daysUntilDue = differenceInDays(dueDate, today);
    if (daysUntilDue < 0) return "OVERDUE";
    if (daysUntilDue === 0) return "DUE_TODAY";
    if (daysUntilDue <= 7) return "DUE_SOON";
    return "OK";
}

function AgingBadge({ status, daysOverdue }: { status: string; daysOverdue?: number }) {
    const cfg: Record<string, { label: string; cls: string; Icon: any }> = {
        PAID:     { label: "Lunas",               cls: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: CheckCircle2 },
        OK:       { label: "Belum Jatuh Tempo",    cls: "bg-blue-50 text-blue-700 border-blue-200",         Icon: Clock },
        DUE_SOON: { label: "\u22647 Hari Lagi",    cls: "bg-amber-50 text-amber-700 border-amber-200",      Icon: AlertCircle },
        DUE_TODAY:{ label: "Jatuh Tempo Hari Ini", cls: "bg-orange-50 text-orange-700 border-orange-200",   Icon: AlertTriangle },
        OVERDUE:  { label: daysOverdue ? `Terlambat ${daysOverdue} Hari` : "Kadaluarsa", cls: "bg-rose-50 text-rose-700 border-rose-200", Icon: AlertTriangle },
    };
    const c = cfg[status] || cfg.OK;
    const Icon = c.Icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${c.cls}`}>
            <Icon className="h-2.5 w-2.5" />{c.label}
        </span>
    );
}

interface Props {
    salesDeliveries: any[];
    goodsReceipts: any[];
    purchaseOrders: any[];
}

export function PartnerLedger({ salesDeliveries, goodsReceipts, purchaseOrders }: Props) {
    const [activeTab, setActiveTab] = useState<"AR"|"AP">("AR");
    const [search, setSearch] = useState("");
    const [selectedPartner, setSelectedPartner] = useState<string|null>(null);
    const [statusFilter, setStatusFilter] = useState("ALL");

    const arByBuyer = useMemo(() => {
        const map = new Map<string,any>();
        for (const d of salesDeliveries) {
            const name = d.buyerName || "Tidak Diketahui";
            if (!map.has(name)) map.set(name, { name, invoices: [], totalGrand: 0, totalPaid: 0, totalOutstanding: 0, overdueCount: 0, dueSoonCount: 0 });
            const b = map.get(name)!;
            const grand = Number(d.grandTotal || 0);
            const paid  = Number(d.paidAmount  || 0);
            const outstanding = grand - paid;
            const status = getAgingStatus(d.date, d.paymentStatus, paid, grand);
            const dueDate = addDays(new Date(d.date), DUE_DAYS);
            const daysOverdue = status === "OVERDUE" ? Math.abs(differenceInDays(dueDate, new Date())) : 0;
            b.invoices.push({ ...d, outstanding, status, dueDate, daysOverdue, returns: (d.returns||[]).filter((r:any)=>!r.isVoid) });
            b.totalGrand += grand; b.totalPaid += paid; b.totalOutstanding += outstanding;
            if (status === "OVERDUE") b.overdueCount++;
            if (status === "DUE_SOON" || status === "DUE_TODAY") b.dueSoonCount++;
        }
        return Array.from(map.values()).sort((a,b) => b.totalOutstanding - a.totalOutstanding);
    }, [salesDeliveries]);

    const apBySupplier = useMemo(() => {
        const map = new Map<string,any>();
        for (const r of goodsReceipts) {
            const name = r.receivedFrom || "Tidak Diketahui";
            if (!map.has(name)) map.set(name, { name, receipts: [], totalGrand: 0, totalPaid: 0, totalOutstanding: 0, overdueCount: 0, dueSoonCount: 0 });
            const s = map.get(name)!;
            const grand = Number(r.grandTotal || 0);
            const paid  = Number(r.paidAmount  || 0);
            const outstanding = grand - paid;
            const status = getAgingStatus(r.date, r.paymentStatus, paid, grand);
            const dueDate = addDays(new Date(r.date), DUE_DAYS);
            const daysOverdue = status === "OVERDUE" ? Math.abs(differenceInDays(dueDate, new Date())) : 0;
            const relReturns = r.returns || [];
            const relPOs     = purchaseOrders.filter((po:any)  => po.vendorName === name);
            s.receipts.push({ ...r, outstanding, status, dueDate, daysOverdue, purchaseReturns: relReturns, purchaseOrders: relPOs });
            s.totalGrand += grand; s.totalPaid += paid; s.totalOutstanding += outstanding;
            if (status === "OVERDUE") s.overdueCount++;
            if (status === "DUE_SOON" || status === "DUE_TODAY") s.dueSoonCount++;
        }
        return Array.from(map.values()).sort((a,b) => b.totalOutstanding - a.totalOutstanding);
    }, [goodsReceipts, purchaseOrders]);

    const partners = activeTab === "AR" ? arByBuyer : apBySupplier;
    const filtered = partners.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) &&
        (statusFilter === "ALL" ||
            (statusFilter === "OVERDUE"     && p.overdueCount > 0) ||
            (statusFilter === "DUE_SOON"    && p.dueSoonCount > 0) ||
            (statusFilter === "OUTSTANDING" && p.totalOutstanding > 0))
    );

    const selected = filtered.find(p => p.name === selectedPartner);
    const invoices  = selected ? (activeTab === "AR" ? selected.invoices : selected.receipts) : [];
    const filteredInvoices = invoices.filter((inv:any) =>
        statusFilter === "ALL" || inv.status === statusFilter ||
        (statusFilter === "OUTSTANDING" && inv.outstanding > 0) ||
        (statusFilter === "DUE_SOON" && (inv.status === "DUE_SOON" || inv.status === "DUE_TODAY"))
    );

    const totalOverdueAR  = arByBuyer.reduce((s,b)  => s + b.overdueCount,  0);
    const totalDueSoonAR  = arByBuyer.reduce((s,b)  => s + b.dueSoonCount,  0);
    const totalOverdueAP  = apBySupplier.reduce((s,b)=> s + b.overdueCount, 0);

    function handleExport() {
        if (!selected) return;
        const rows = filteredInvoices.map((inv:any) => ({
            "No. Faktur":   activeTab === "AR" ? (inv.invoiceNumber || inv.deliveryNumber) : inv.receiptNumber,
            "Tanggal":      format(new Date(inv.date), "dd/MM/yyyy"),
            "Jatuh Tempo":  format(inv.dueDate, "dd/MM/yyyy"),
            "Status":       inv.status,
            "Total":        Number(inv.grandTotal),
            "Terbayar":     Number(inv.paidAmount),
            "Sisa":         inv.outstanding,
        }));
        exportToExcel(rows, `Ledger_${selected.name.replace(/\s+/g,"_")}`);
    }

    return (
        <div className="min-h-screen bg-slate-50/50">
            {/* Header */}
            <div className="bg-white border-b border-slate-100 px-8 py-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-lg font-black text-slate-900 tracking-tight">Buku Besar Mitra</h1>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-0.5">Rincian AR Buyer & AP Supplier · Alert Jatuh Tempo & Retur</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {totalOverdueAR > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 border border-rose-200 rounded-xl">
                            <AlertTriangle className="h-4 w-4 text-rose-600" />
                            <span className="text-xs font-black text-rose-700">{totalOverdueAR} Faktur AR Kadaluarsa</span>
                        </div>
                    )}
                    {totalDueSoonAR > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                            <span className="text-xs font-black text-amber-700">{totalDueSoonAR} AR Jatuh Tempo \u22647 Hari</span>
                        </div>
                    )}
                    {totalOverdueAP > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-xl">
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                            <span className="text-xs font-black text-orange-700">{totalOverdueAP} Hutang AP Kadaluarsa</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-6 space-y-5">
                {/* Controls */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                        {([
                            { id:"AR", label:"AR — Piutang Buyer",    Icon: ArrowUpCircle,   color:"text-emerald-600" },
                            { id:"AP", label:"AP — Hutang Supplier",   Icon: ArrowDownCircle, color:"text-rose-600"    },
                        ] as const).map(tab => (
                            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSelectedPartner(null); }}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab===tab.id?"bg-white shadow-sm text-slate-900":"text-slate-500 hover:text-slate-700"}`}>
                                <tab.Icon className={`h-3.5 w-3.5 ${tab.color}`}/>{tab.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                        {[
                            { id:"ALL",         label:"Semua" },
                            { id:"OUTSTANDING", label:"Outstanding" },
                            { id:"DUE_SOON",    label:"Hampir JT" },
                            { id:"OVERDUE",     label:"Kadaluarsa" },
                        ].map(f => (
                            <button key={f.id} onClick={()=>setStatusFilter(f.id)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter===f.id
                                    ? f.id==="OVERDUE"?"bg-rose-600 text-white shadow-sm"
                                        :f.id==="DUE_SOON"?"bg-amber-500 text-white shadow-sm"
                                            :"bg-white shadow-sm text-slate-900"
                                    :"text-slate-500 hover:text-slate-700"}`}>
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <div className="relative ml-auto">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400"/>
                        <input value={search} onChange={e=>setSearch(e.target.value)}
                            placeholder={`Cari ${activeTab==="AR"?"buyer":"supplier"}...`}
                            className="pl-9 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900/10 w-64 font-medium"/>
                    </div>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-12 gap-5 items-start">
                    {/* Partner List */}
                    <div className="col-span-4 space-y-2 max-h-[80vh] overflow-y-auto pr-1">
                        {filtered.length===0 && <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400 text-xs italic">Tidak ada mitra ditemukan.</div>}
                        {filtered.map(p => (
                            <button key={p.name} onClick={()=>setSelectedPartner(p.name===selectedPartner?null:p.name)}
                                className={`w-full text-left bg-white rounded-2xl border p-4 transition-all hover:shadow-md ${selectedPartner===p.name?"border-slate-900 shadow-md":"border-slate-100"}`}>
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-sm text-slate-900 truncate">{p.name}</span>
                                            {p.overdueCount>0 && <span className="shrink-0 h-5 w-5 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">{p.overdueCount}</span>}
                                            {p.overdueCount===0 && p.dueSoonCount>0 && <span className="shrink-0 h-5 w-5 rounded-full bg-amber-400 text-white text-[9px] font-black flex items-center justify-center">{p.dueSoonCount}</span>}
                                        </div>
                                        <div className="flex items-center gap-4 mt-2">
                                            <div>
                                                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Outstanding</span>
                                                <span className={`text-sm font-black font-mono ${p.totalOutstanding>0?(activeTab==="AR"?"text-emerald-600":"text-rose-600"):"text-slate-400"}`}>{formatCurrency(p.totalOutstanding)}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Total</span>
                                                <span className="text-xs font-bold text-slate-600 font-mono">{formatCurrency(p.totalGrand)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight className={`h-4 w-4 text-slate-400 mt-1 transition-transform ${selectedPartner===p.name?"rotate-90":""}`}/>
                                </div>
                                {p.overdueCount>0 && (
                                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5">
                                        <AlertTriangle className="h-3 w-3 text-rose-500"/>
                                        <span className="text-[9px] font-black text-rose-600 uppercase tracking-wider">{p.overdueCount} Faktur Kadaluarsa — {activeTab==="AP" ? "Segera Bayar!" : "Segera Tagih!"}</span>
                                    </div>
                                )}
                                {p.overdueCount===0 && p.dueSoonCount>0 && (
                                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5">
                                        <AlertCircle className="h-3 w-3 text-amber-500"/>
                                        <span className="text-[9px] font-black text-amber-600 uppercase tracking-wider">{p.dueSoonCount} Hampir Jatuh Tempo</span>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Detail Panel */}
                    <div className="col-span-8">
                        {!selected ? (
                            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                                <div className="p-4 bg-slate-50 rounded-2xl mb-4">
                                    {activeTab==="AR"?<ArrowUpCircle className="h-8 w-8 text-emerald-400"/>:<ArrowDownCircle className="h-8 w-8 text-rose-400"/>}
                                </div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-2">Pilih {activeTab==="AR"?"Buyer":"Supplier"}</h3>
                                <p className="text-[10px] text-slate-400 max-w-xs">Klik salah satu mitra di panel kiri untuk melihat rincian faktur, status jatuh tempo, dan informasi retur.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Summary Card */}
                                <div className={`rounded-2xl p-5 text-white relative overflow-hidden ${activeTab==="AR"?"bg-gradient-to-br from-emerald-700 to-emerald-900":"bg-gradient-to-br from-rose-700 to-rose-900"}`}>
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.08),transparent_70%)]"/>
                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <span className="text-[9px] font-black uppercase tracking-widest opacity-70">{activeTab==="AR"?"Piutang Buyer":"Hutang Supplier"}</span>
                                                <h2 className="text-xl font-black mt-0.5">{selected.name}</h2>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border border-white/20">
                                                    <Download className="h-3 w-3"/> Export
                                                </button>
                                                <button onClick={()=>setSelectedPartner(null)} className="p-2 bg-white/15 hover:bg-white/25 rounded-xl transition-all">
                                                    <X className="h-3.5 w-3.5"/>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            {[
                                                { label:"Total Transaksi",  val: selected.totalGrand },
                                                { label:"Total Terbayar",   val: selected.totalPaid },
                                                { label:"Outstanding",      val: selected.totalOutstanding },
                                            ].map(s => (
                                                <div key={s.label}>
                                                    <span className="text-[9px] opacity-60 uppercase tracking-wider font-bold block">{s.label}</span>
                                                    <span className="text-lg font-black font-mono">{formatCurrency(s.val)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Invoice Table */}
                                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                                    <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
                                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Rincian {activeTab==="AR"?"Faktur Penjualan":"LPB / Faktur Pembelian"}</h3>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase">Jatuh Tempo = Tgl Faktur + {DUE_DAYS} Hari (NET{DUE_DAYS})</span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs text-left">
                                            <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-wider font-black text-slate-500">
                                                <tr>
                                                    <th className="px-5 py-3">No. Faktur</th>
                                                    <th className="px-5 py-3 whitespace-nowrap">Tgl Faktur</th>
                                                    <th className="px-5 py-3 whitespace-nowrap">Jatuh Tempo</th>
                                                    <th className="px-5 py-3 text-right whitespace-nowrap">Total</th>
                                                    <th className="px-5 py-3 text-right whitespace-nowrap">Terbayar</th>
                                                    <th className="px-5 py-3 whitespace-nowrap">Tgl Bayar</th>
                                                    <th className="px-5 py-3 text-right whitespace-nowrap">Sisa</th>
                                                    <th className="px-5 py-3">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {filteredInvoices.length===0 && (
                                                    <tr><td colSpan={8} className="px-5 py-8 text-center text-slate-400 italic text-[10px] uppercase tracking-widest">Tidak ada data</td></tr>
                                                )}
                                                {filteredInvoices.map((inv:any) => (
                                                    <InvoiceRow key={inv.id} inv={inv} activeTab={activeTab}
                                                        refNum={activeTab==="AR"?(inv.invoiceNumber||inv.deliveryNumber):inv.receiptNumber}
                                                        returns={activeTab==="AR"?(inv.returns||[]):(inv.purchaseReturns||[])}
                                                        purchaseOrders={activeTab==="AP"?(inv.purchaseOrders||[]):[]}
                                                    />
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function InvoiceRow({ inv, refNum, returns, activeTab, purchaseOrders }: any) {
    const [expanded, setExpanded] = useState(false);
    const hasExtra = returns.length>0 || purchaseOrders.length>0;
    return (
        <>
            <tr onClick={()=>hasExtra&&setExpanded(e=>!e)}
                className={`transition-all ${hasExtra?"cursor-pointer hover:bg-slate-50":""} ${inv.status==="OVERDUE"?"bg-rose-50/30":inv.status==="DUE_TODAY"?"bg-orange-50/30":inv.status==="DUE_SOON"?"bg-amber-50/30":""}`}>
                <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                        {hasExtra && <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${expanded?"rotate-180":""}`}/>}
                        <span className="font-mono font-black text-slate-800 text-[10px]">{refNum}</span>
                    </div>
                </td>
                <td className="px-5 py-3.5 font-mono text-slate-500 text-[10px] whitespace-nowrap">{format(new Date(inv.date),"dd/MM/yy")}</td>
                <td className="px-5 py-3.5 font-mono text-[10px] whitespace-nowrap">
                    <span className={inv.status==="OVERDUE"||inv.status==="DUE_TODAY"?"text-rose-600 font-black":inv.status==="DUE_SOON"?"text-amber-600 font-black":"text-slate-500"}>
                        {format(inv.dueDate,"dd/MM/yy")}
                    </span>
                </td>
                <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-700 whitespace-nowrap">{formatCurrency(Number(inv.grandTotal))}</td>
                <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-600 whitespace-nowrap">{formatCurrency(Number(inv.paidAmount))}</td>
                <td className="px-5 py-3.5 font-mono text-[10px] whitespace-nowrap">
                    {Number(inv.paidAmount) > 0 && inv.updatedAt
                        ? <span className="text-emerald-600 font-bold">{format(new Date(inv.updatedAt), "dd/MM/yy")}</span>
                        : <span className="text-slate-300">—</span>
                    }
                </td>
                <td className="px-5 py-3.5 text-right font-mono font-black whitespace-nowrap">
                    <span className={inv.outstanding>0?(activeTab==="AR"?"text-emerald-700":"text-rose-700"):"text-slate-400"}>{formatCurrency(inv.outstanding)}</span>
                </td>
                <td className="px-5 py-3.5"><AgingBadge status={inv.status} daysOverdue={inv.daysOverdue}/></td>
            </tr>
            {expanded && (
                <tr>
                    <td colSpan={8} className="px-8 py-3 bg-slate-50/80 border-b border-slate-100">
                        <div className="space-y-3">
                            {returns.length>0 && (
                                <div>
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <RotateCcw className="h-3 w-3 text-rose-500"/>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-rose-600">Retur ({returns.length})</span>
                                    </div>
                                    {returns.map((r:any) => (
                                        <div key={r.id} className="flex items-center gap-4 text-[10px] bg-white border border-rose-100 rounded-lg px-3 py-2 mb-1">
                                            <span className="font-mono font-black text-slate-700">{r.returnNumber}</span>
                                            <span className="text-slate-500">{format(new Date(r.date),"dd/MM/yyyy")}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${r.status==="APPROVED"?"bg-emerald-50 text-emerald-700":r.status==="PENDING"?"bg-amber-50 text-amber-700":"bg-slate-100 text-slate-500"}`}>{r.status}</span>
                                            <span className="text-slate-500">{r.items?.length||0} item</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {purchaseOrders.length>0 && (
                                <div>
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <ShoppingCart className="h-3 w-3 text-blue-500"/>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-blue-600">PO Terkait ({purchaseOrders.length})</span>
                                    </div>
                                    {purchaseOrders.map((po:any) => (
                                        <div key={po.id} className="flex items-center gap-4 text-[10px] bg-white border border-blue-100 rounded-lg px-3 py-2 mb-1">
                                            <span className="font-mono font-black text-slate-700">{po.poNumber}</span>
                                            <span className="text-slate-500">{format(new Date(po.date),"dd/MM/yyyy")}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${po.status==="CLOSED"?"bg-slate-100 text-slate-500":po.status==="APPROVED"?"bg-emerald-50 text-emerald-700":"bg-amber-50 text-amber-700"}`}>{po.status}</span>
                                            <span className="font-mono font-bold text-slate-700">{formatCurrency(Number(po.totalAmount||0))}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}
