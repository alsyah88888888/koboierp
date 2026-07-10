"use client";

import { useState, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Truck,
  RefreshCw, Activity, Calendar, BarChart3, ShieldCheck
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const COLOR_MAP: any = {
  blue:    { bg: "bg-blue-50",    text: "text-blue-600",    border: "border-blue-200",   badge: "bg-blue-100 text-blue-700" },
  indigo:  { bg: "bg-indigo-50",  text: "text-indigo-600",  border: "border-indigo-200", badge: "bg-indigo-100 text-indigo-700" },
  orange:  { bg: "bg-orange-50",  text: "text-orange-600",  border: "border-orange-200", badge: "bg-orange-100 text-orange-700" },
  purple:  { bg: "bg-purple-50",  text: "text-purple-600",  border: "border-purple-200", badge: "bg-purple-100 text-purple-700" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200",badge: "bg-emerald-100 text-emerald-700" },
  sky:     { bg: "bg-sky-50",     text: "text-sky-600",     border: "border-sky-200",    badge: "bg-sky-100 text-sky-700" },
  amber:   { bg: "bg-amber-50",   text: "text-amber-600",   border: "border-amber-200",  badge: "bg-amber-100 text-amber-700" },
};

export function PublicDashboard({ stats, weeklyStats, dailyReport, traceabilityData, token }: any) {
  const [now, setNow] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { sales = [], purchases = [] } = dailyReport || {};

  useEffect(() => {
    const update = () => setNow(new Date().toLocaleString("id-ID", {
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    }));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const refresh = setInterval(() => {
      setRefreshing(true);
      setTimeout(() => {
        window.location.reload();
      }, 300);
    }, 5 * 60 * 1000);
    return () => clearInterval(refresh);
  }, []);

  const chartData = (weeklyStats || []).map((w: any) => ({
    name: w.week || w.label || "-",
    Penjualan: Number(w.sales || 0),
    Pembelian: Number(w.purchases || 0),
  }));

  const soSummary = traceabilityData?.soSummary || {};
  const prSummary = traceabilityData?.prSummary || {};
  const opSummary = traceabilityData?.opSummary || {};
  const openPartialOrders = [...(soSummary.openOrders || []), ...(soSummary.partialOrders || [])];
  const pendingPR = prSummary.pendingOrders || [];
  const pendingOP = opSummary.pendingOrders || [];

  const SectionTitle = ({ color, title }: { color: string; title: string }) => (
    <div className="flex items-center gap-3 mb-4">
      <div className={`h-6 w-1.5 rounded-full ${color}`} />
      <h2 className="text-base font-black text-slate-800 uppercase tracking-tight">{title}</h2>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-slate-900 text-white shadow-2xl shadow-slate-900/30">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center font-black text-sm">
              KB
            </div>
            <div>
              <h1 className="font-black text-base leading-none tracking-tight">PT. KOLA BORASI INDONESIA</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Dashboard Operasional — Live View</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold">LIVE</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span className="font-mono">{now}</span>
            </div>
            <div
              title="Auto-refresh setiap 5 menit"
              className={`flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors ${refreshing ? "text-white" : ""}`}
              onClick={() => window.location.reload()}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-6 py-8 space-y-10">

        {/* ── STATS CARDS ─────────────────────────────────────────────── */}
        <section>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {stats.map((s: any, i: number) => {
              const c = COLOR_MAP[s.color] || COLOR_MAP.blue;
              return (
                <div key={i} className={`rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md transition-shadow ${c.border}`}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{s.name}</p>
                  <p className={`text-xl font-black tracking-tighter leading-none ${c.text}`}>{s.value}</p>
                  <div className="flex items-center gap-1 mt-2">
                    {s.trend === "up"
                      ? <TrendingUp className="h-3 w-3 text-emerald-500" />
                      : <TrendingDown className="h-3 w-3 text-rose-500" />
                    }
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{s.sub}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── CHART TREND MINGGUAN ─────────────────────────────────────── */}
        {chartData.length > 0 && (
          <section>
            <SectionTitle color="bg-gradient-to-b from-blue-400 to-blue-600" title="Tren Penjualan & Pembelian" />
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                  <defs>
                    <linearGradient id="sales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="purchases" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}jt`} />
                  <Tooltip
                    formatter={(v: any) => formatCurrency(v)}
                    contentStyle={{ fontSize: 11, fontWeight: 700, borderRadius: 8, border: "1px solid #e2e8f0" }}
                  />
                  <Area type="monotone" dataKey="Penjualan" stroke="#3b82f6" strokeWidth={2.5} fill="url(#sales)" />
                  <Area type="monotone" dataKey="Pembelian" stroke="#10b981" strokeWidth={2.5} fill="url(#purchases)" />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-6 mt-2 justify-center">
                <div className="flex items-center gap-1.5"><div className="h-2 w-4 rounded-full bg-blue-500" /><span className="text-[10px] font-bold text-slate-500">Penjualan</span></div>
                <div className="flex items-center gap-1.5"><div className="h-2 w-4 rounded-full bg-emerald-500" /><span className="text-[10px] font-bold text-slate-500">Pembelian</span></div>
              </div>
            </div>
          </section>
        )}

        {/* ── STATUS SO ────────────────────────────────────────────────── */}
        {traceabilityData && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-6 w-1.5 rounded-full bg-gradient-to-b from-blue-400 to-blue-600" />
              <h2 className="text-base font-black text-slate-800 uppercase tracking-tight">Status Sales Order</h2>
              <div className="flex items-center gap-3 ml-auto text-[10px] font-black uppercase tracking-widest">
                <span className="flex items-center gap-1 text-blue-600"><AlertCircle className="h-3.5 w-3.5" /> Open: {soSummary.open || 0}</span>
                <span className="flex items-center gap-1 text-indigo-600"><Truck className="h-3.5 w-3.5" /> Partial: {soSummary.partial || 0}</span>
                <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> Closed: {soSummary.closed || 0}</span>
              </div>
            </div>
            {openPartialOrders.length > 0 ? (
              <div className="bg-white rounded-2xl border border-blue-200/60 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-slate-900 text-white">
                        <th className="px-4 py-3 text-left font-black uppercase tracking-wider">No. SO</th>
                        <th className="px-4 py-3 text-left font-black uppercase tracking-wider">Buyer</th>
                        <th className="px-4 py-3 text-right font-black uppercase tracking-wider w-20">Qty Order</th>
                        <th className="px-4 py-3 text-right font-black uppercase tracking-wider w-20">Terkirim</th>
                        <th className="px-4 py-3 text-center font-black uppercase tracking-wider w-32">Progress</th>
                        <th className="px-4 py-3 text-center font-black uppercase tracking-wider w-24">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {openPartialOrders.map((so: any, i: number) => {
                        const pct = Math.round((so.shippedQty / Math.max(1, so.totalQty)) * 100);
                        return (
                          <tr key={i} className={`border-b border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                            <td className="px-4 py-2.5 font-black text-slate-900">{so.orderNumber}</td>
                            <td className="px-4 py-2.5 font-bold text-slate-700 max-w-[200px] truncate">{so.buyerName}</td>
                            <td className="px-4 py-2.5 text-right font-black tabular-nums">{so.totalQty}</td>
                            <td className="px-4 py-2.5 text-right font-black tabular-nums">{so.shippedQty}</td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${pct >= 100 ? "bg-emerald-500" : pct > 50 ? "bg-indigo-500" : "bg-blue-400"}`} style={{ width: `${Math.min(100, pct)}%` }} />
                                </div>
                                <span className="text-[10px] font-black text-slate-500 w-8 text-right tabular-nums">{pct}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${pct > 0 ? "bg-indigo-100 text-indigo-700" : "bg-blue-100 text-blue-700"}`}>
                                {pct > 0 ? "PARTIAL" : "OPEN"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50/50 rounded-2xl border border-emerald-200/60 p-6 text-center">
                <p className="text-[11px] font-black text-emerald-700 uppercase tracking-widest flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Semua SO sudah CLOSED — {soSummary.closed || 0} SO selesai
                </p>
              </div>
            )}
          </section>
        )}

        {/* ── STATUS PR & OPERASIONAL ──────────────────────────────────── */}
        {traceabilityData && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Purchase Order */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-6 w-1.5 rounded-full bg-gradient-to-b from-amber-400 to-amber-600" />
                <h2 className="text-base font-black text-slate-800 uppercase tracking-tight">Status Purchase Order</h2>
                <div className="ml-auto flex items-center gap-3 text-[10px] font-black uppercase tracking-widest">
                  <span className="text-amber-600 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> Pending: {prSummary.pending || 0}</span>
                  <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Done: {prSummary.executed || 0}</span>
                </div>
              </div>
              {pendingPR.length > 0 ? (
                <div className="bg-white rounded-2xl border border-amber-200/60 shadow-sm overflow-hidden">
                  <table className="w-full text-[11px]">
                    <thead><tr className="bg-slate-900 text-white">
                      <th className="px-4 py-3 text-left font-black uppercase tracking-wider">No. PR</th>
                      <th className="px-4 py-3 text-left font-black uppercase tracking-wider">Pemohon</th>
                      <th className="px-4 py-3 text-right font-black uppercase tracking-wider">Total</th>
                      <th className="px-4 py-3 text-center font-black uppercase tracking-wider">Status</th>
                    </tr></thead>
                    <tbody>
                      {pendingPR.map((pr: any, i: number) => (
                        <tr key={i} className={`border-b border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                          <td className="px-4 py-2.5 font-black text-slate-900">{pr.orderNumber}</td>
                          <td className="px-4 py-2.5 font-bold text-slate-700 truncate max-w-[150px]">{pr.buyerName}</td>
                          <td className="px-4 py-2.5 text-right font-black tabular-nums">Rp {Number(pr.grandTotal).toLocaleString("id-ID")}</td>
                          <td className="px-4 py-2.5 text-center"><span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-700">PENDING</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-emerald-50/50 rounded-2xl border border-emerald-200/60 p-6 text-center min-h-[100px] flex items-center justify-center">
                  <p className="text-[11px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Semua PR EXECUTED</p>
                </div>
              )}
            </div>

            {/* Operasional */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-6 w-1.5 rounded-full bg-gradient-to-b from-purple-400 to-purple-600" />
                <h2 className="text-base font-black text-slate-800 uppercase tracking-tight">Status Operasional</h2>
                <div className="ml-auto flex items-center gap-3 text-[10px] font-black uppercase tracking-widest">
                  <span className="text-purple-600 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> Pending: {opSummary.pending || 0}</span>
                  <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Done: {opSummary.executed || 0}</span>
                </div>
              </div>
              {pendingOP.length > 0 ? (
                <div className="bg-white rounded-2xl border border-purple-200/60 shadow-sm overflow-hidden">
                  <table className="w-full text-[11px]">
                    <thead><tr className="bg-slate-900 text-white">
                      <th className="px-4 py-3 text-left font-black uppercase tracking-wider">No. Pengajuan</th>
                      <th className="px-4 py-3 text-left font-black uppercase tracking-wider">Pemohon</th>
                      <th className="px-4 py-3 text-right font-black uppercase tracking-wider">Total</th>
                      <th className="px-4 py-3 text-center font-black uppercase tracking-wider">Status</th>
                    </tr></thead>
                    <tbody>
                      {pendingOP.map((op: any, i: number) => (
                        <tr key={i} className={`border-b border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                          <td className="px-4 py-2.5 font-black text-slate-900">{op.orderNumber}</td>
                          <td className="px-4 py-2.5 font-bold text-slate-700 truncate max-w-[150px]">{op.buyerName}</td>
                          <td className="px-4 py-2.5 text-right font-black tabular-nums">Rp {Number(op.grandTotal).toLocaleString("id-ID")}</td>
                          <td className="px-4 py-2.5 text-center"><span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-purple-100 text-purple-700">PENDING</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-emerald-50/50 rounded-2xl border border-emerald-200/60 p-6 text-center min-h-[100px] flex items-center justify-center">
                  <p className="text-[11px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Semua Operasional EXECUTED</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── TRANSAKSI HARI INI ───────────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Penjualan */}
          <div>
            <SectionTitle color="bg-gradient-to-b from-blue-400 to-blue-600" title="Penjualan Hari Ini" />
            <div className="bg-white rounded-2xl border border-blue-200/60 shadow-sm overflow-hidden">
              <table className="w-full text-[11px]">
                <thead><tr className="bg-slate-900 text-white">
                  <th className="px-4 py-3 text-left font-black uppercase tracking-wider">No. SJ</th>
                  <th className="px-4 py-3 text-left font-black uppercase tracking-wider">Buyer</th>
                  <th className="px-4 py-3 text-right font-black uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-center font-black uppercase tracking-wider">Status</th>
                </tr></thead>
                <tbody>
                  {sales.length > 0 ? sales.map((s: any, i: number) => (
                    <tr key={i} className={`border-b border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                      <td className="px-4 py-2.5 font-black text-slate-900">{s.deliveryNumber}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-700 truncate max-w-[150px]">{s.buyerName || s.recipient}</td>
                      <td className="px-4 py-2.5 text-right font-black tabular-nums">{formatCurrency(s.grandTotal)}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${s.paymentStatus === "PAID" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                          {s.paymentStatus || "PENDING"}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Tidak ada penjualan hari ini</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pembelian */}
          <div>
            <SectionTitle color="bg-gradient-to-b from-emerald-400 to-emerald-600" title="Pembelian Hari Ini" />
            <div className="bg-white rounded-2xl border border-emerald-200/60 shadow-sm overflow-hidden">
              <table className="w-full text-[11px]">
                <thead><tr className="bg-slate-900 text-white">
                  <th className="px-4 py-3 text-left font-black uppercase tracking-wider">No. LPB</th>
                  <th className="px-4 py-3 text-left font-black uppercase tracking-wider">Supplier</th>
                  <th className="px-4 py-3 text-right font-black uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-center font-black uppercase tracking-wider">Verifikasi</th>
                </tr></thead>
                <tbody>
                  {purchases.length > 0 ? purchases.map((p: any, i: number) => (
                    <tr key={i} className={`border-b border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                      <td className="px-4 py-2.5 font-black text-slate-900">{p.receiptNumber}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-700 truncate max-w-[150px]">{p.receivedFrom}</td>
                      <td className="px-4 py-2.5 text-right font-black tabular-nums">{formatCurrency(p.grandTotal)}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${p.isVerified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                          {p.isVerified ? "VERIFIED" : "PENDING"}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Tidak ada pembelian hari ini</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── FOOTER ─────────────────────────────────────────────────── */}
        <footer className="border-t border-slate-200 pt-6 pb-2">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>Data dilindungi — Hanya untuk stakeholder resmi</span>
            </div>
            <span>PT. KOLA BORASI INDONESIA © {new Date().getFullYear()}</span>
          </div>
        </footer>

      </main>
    </div>
  );
}
