"use client";

import { useState, useEffect, useCallback } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell, Legend
} from "recharts";
import {
    Calendar, TrendingUp, TrendingDown, ShoppingBag, ShoppingCart,
    Wallet, Package, ArrowUpRight, ArrowDownRight, FileSpreadsheet,
    Activity, BarChart3, RefreshCw, Clock, CreditCard, AlertCircle,
    CheckCircle2, ArrowRight, Printer, ChevronLeft, ChevronRight,
    DollarSign, Receipt, Truck, RotateCcw, Shield, Users, Building,
    FileCode2, Sparkles, Banknote, Search, Download, Eye, ArrowUpCircle, ArrowDownCircle, X, Edit2
} from "lucide-react";
import * as XLSX from "xlsx";
import { formatCurrency, cn } from "@/lib/utils";
import {
    getComprehensiveDailyReportAction,
    getComprehensiveWeeklyReportAction,
    getComprehensiveMonthlyReportAction
} from "@/actions/reports";
import { callAction } from "@/proxy";
import { format } from "date-fns";
import { TraceabilityReallocateModal } from "./TraceabilityReallocateModal";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════
type ReportTab = "daily" | "weekly" | "monthly" | "closing";

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
const PAYMENT_BADGE: Record<string, string> = {
    PAID: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    PARTIAL: 'bg-amber-50 text-amber-700 border-amber-100',
    PENDING: 'bg-slate-50 text-slate-500 border-slate-100',
    CREDIT: 'bg-blue-50 text-blue-700 border-blue-100',
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export function ReportsDashboard() {
    const [activeTab, setActiveTab] = useState<ReportTab>("daily");
    const [isLoading, setIsLoading] = useState(false);
    const [isClient, setIsClient] = useState(false);

    // Period controls
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [selectedWeekStart, setSelectedWeekStart] = useState(() => {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        return d.toISOString().split('T')[0];
    });
    const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

    // Data
    const [dailyData, setDailyData] = useState<any>(null);
    const [weeklyData, setWeeklyData] = useState<any>(null);
    const [monthlyData, setMonthlyData] = useState<any>(null);

    // Closing Report State
    const [selectedTraceData, setSelectedTraceData] = useState<any>(null);
    const [isTraceModalOpen, setIsTraceModalOpen] = useState(false);

    const [closingReport, setClosingReport] = useState<any>(null);
    const [closingPeriod, setClosingPeriod] = useState({ 
        month: new Date().getMonth() + 1, 
        year: new Date().getFullYear() 
    });
    const [drillDownData, setDrillDownData] = useState<{title: string, data: any[], type: string} | null>(null);
    const [isFetchingClosing, setIsFetchingClosing] = useState(false);
    const [closingPrefix, setClosingPrefix] = useState<'PF' | 'BC' | 'ALL'>('ALL');
    const [activePrefix, setActivePrefix] = useState<'PF' | 'BC' | 'ALL'>('ALL');

    useEffect(() => { setIsClient(true); }, []);

    // ── Data Fetching ─────────────────────────────────────────────────────
    const fetchDaily = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getComprehensiveDailyReportAction(selectedDate, activePrefix);
            setDailyData(data);
        } catch (e) { console.error(e); }
        setIsLoading(false);
    }, [selectedDate, activePrefix]);

    const fetchWeekly = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getComprehensiveWeeklyReportAction(selectedWeekStart, activePrefix);
            setWeeklyData(data);
        } catch (e) { console.error(e); }
        setIsLoading(false);
    }, [selectedWeekStart, activePrefix]);

    const fetchMonthly = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getComprehensiveMonthlyReportAction(selectedMonth, selectedYear, activePrefix);
            setMonthlyData(data);
        } catch (e) { console.error(e); }
        setIsLoading(false);
    }, [selectedMonth, selectedYear, activePrefix]);

    const fetchClosingReport = async (m: number, y: number, pref: 'PF' | 'BC' | 'ALL' = 'ALL') => {
        setIsFetchingClosing(true);
        setClosingReport(null);
        try {
            const data = await callAction("getMonthlyClosingReport", m, y, pref);
            setClosingReport(data);
        } catch (err) {
            console.error("Fetch Failed:", err);
            setClosingReport({ error: "Koneksi terputus atau server sibuk." });
        } finally {
            setIsFetchingClosing(false);
        }
    };

    const downloadPurchasesExcel = () => {
        if (!closingReport?.details?.purchases) return;
        
        const data = closingReport.details.purchases.map((p: any) => ({
            'Tanggal': format(new Date(p.date), 'MM/dd/yyyy'),
            'No. LPB': p.number,
            'Supplier': p.entity,
            'Subtotal': p.subtotal,
            'Diskon': p.discount,
            'PPN %': p.taxRate / 100, // Format 11 as 0.11
            'Pajak Rp': p.tax,
            'Grand Total Netto': p.grandTotal,
            'Sudah Dibayarkan (BCA)': p.paidAmount
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Pembelian");
        XLSX.writeFile(wb, `Laporan_Pembelian_${closingPeriod.month}_${closingPeriod.year}.xlsx`);
    };

    const downloadSalesExcel = () => {
        if (!closingReport?.details?.sales) return;
        
        const data = closingReport.details.sales.map((s: any) => ({
            'Tanggal': format(new Date(s.date), 'MM/dd/yyyy'),
            'No. Invoice': s.invoiceNumber || s.number,
            'No. Surat Jalan': s.number,
            'Customer': s.entity,
            'Qty': s.totalQty,
            'Total Harga': s.subtotal - s.discount,
            'PPN 11%': s.tax,
            'Grand Total Netto': s.grandTotal,
            'Sudah Dibayar (BCA)': s.paidAmount
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Penjualan");
        XLSX.writeFile(wb, `Laporan_Penjualan_${closingPeriod.month}_${closingPeriod.year}.xlsx`);
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const getCommonStyles = () => `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                @page { size: A4; margin: 15mm 12mm; }
                body { font-family: 'Inter', sans-serif; padding: 0; color: #1e293b; line-height: 1.4; font-size: 11px; }
                .header { border-bottom: 3px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
                .header h1 { margin: 0; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; font-size: 22px; color: #0f172a; }
                .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
                .summary-grid-6 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
                .summary-card { padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; }
                .summary-card p { margin: 0; font-size: 9px; font-weight: 900; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
                .summary-card h2 { margin: 4px 0 0; font-size: 16px; font-weight: 900; letter-spacing: -0.5px; }
                .summary-card.highlight { background: #f0fdf4; border: 1px solid #059669; }
                .summary-card.danger { background: #fef2f2; border: 1px solid #dc2626; }
                h3 { font-weight: 900; text-transform: uppercase; font-size: 12px; border-left: 3px solid #3b82f6; padding-left: 10px; margin-top: 24px; margin-bottom: 10px; color: #0f172a; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 9px; }
                th { background: #f1f5f9; padding: 6px 8px; text-align: left; font-weight: 900; text-transform: uppercase; font-size: 8px; border-bottom: 2px solid #cbd5e1; color: #475569; }
                td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; color: #334155; }
                tr:nth-child(even) { background: #fafafa; }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                .font-black { font-weight: 900; color: #0f172a; }
                .text-green { color: #059669; }
                .text-red { color: #dc2626; }
                .text-blue { color: #2563eb; }
                .total-row td { font-weight: 900; border-top: 2px solid #0f172a; background: #f8fafc; font-size: 10px; }
                .section-divider { page-break-before: always; }
                .footer-sig { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; text-align: center; gap: 30px; }
                .sig-box { border-top: 1px solid #cbd5e1; padding-top: 8px; font-weight: 900; font-size: 11px; margin: 0 auto; width: 180px; }
                .page-title { font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px; }
                .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                @media print { 
                    body { padding: 0; }
                    .section-divider { page-break-before: always; }
                    .no-break { page-break-inside: avoid; }
                }
            </style>
        `;

        const getHeaderHTML = (title: string, periodStr: string) => `
            <div class="header">
                <div style="display: flex; gap: 14px; align-items: center;">
                    <div style="width: 48px; height: 48px; background: #0f172a; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 18px;">
                        KB
                    </div>
                    <div>
                        <h1 style="margin: 0; font-weight: 900; font-size: 20px; color: #0f172a; letter-spacing: -1px;">PT. KOLA BORASI INDONESIA</h1>
                        <p style="margin: 2px 0 0; color: #64748b; font-size: 9px;">Jl. Raya Cibinong No.10, Bogor, Jawa Barat 16911</p>
                    </div>
                </div>
                <div class="text-right">
                    <h2 style="margin: 0; font-weight: 900; color: #3b82f6; font-size: 16px; text-transform: uppercase;">${title}</h2>
                    <p style="margin: 3px 0 0; font-weight: 700; color: #64748b; font-size: 10px;">Periode: ${periodStr}</p>
                    <p style="margin: 2px 0 0; font-size: 8px; font-weight: 900; color: #94a3b8; text-transform: uppercase;">Dicetak: ${format(new Date(), "dd MMM yyyy HH:mm")}</p>
                </div>
            </div>
        `;

        const getFooterHTML = () => `
            <div class="footer-sig">
                <div>
                    <p style="font-size: 9px; font-weight: 900; color: #64748b; margin-bottom: 50px; text-transform: uppercase;">Dibuat Oleh</p>
                    <div class="sig-box">ADMINISTRATOR</div>
                </div>
                <div>
                    <p style="font-size: 9px; font-weight: 900; color: #64748b; margin-bottom: 50px; text-transform: uppercase;">Disetujui Oleh</p>
                    <div class="sig-box">MANAGEMENT</div>
                </div>
            </div>
            <script>
                window.onload = () => { setTimeout(() => { window.print(); }, 500); };
            </script>
        `;

        const getMiniHeaderHTML = (title: string, periodStr: string) => `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 14px;">
                <div style="display: flex; gap: 10px; align-items: center;">
                    <div style="width: 28px; height: 28px; background: #0f172a; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 10px;">KB</div>
                    <span style="font-weight: 900; font-size: 11px; color: #0f172a;">PT. KOLA BORASI INDONESIA</span>
                </div>
                <div class="text-right">
                    <span style="font-weight: 900; color: #3b82f6; font-size: 10px; text-transform: uppercase;">${title}</span>
                    <span style="color: #94a3b8; font-size: 9px; margin-left: 10px;">Periode: ${periodStr}</span>
                </div>
            </div>
        `;

        let html = '';

        if (activeTab === "closing" && monthlyData) {
            const data = monthlyData;
            const divLabel = closingPrefix !== 'ALL' ? ` — ${closingPrefix} DIV` : ' — ALL DIV';
            const periodLabel = (data.period?.label || `${monthNames[selectedMonth - 1]} ${selectedYear}`) + divLabel;
            const pl = data.profitLoss || {};
            const traceData = data.details?.monthlyTraceability || [];
            const salesDetail = data.details?.sales || [];
            const purchaseDetail = data.details?.purchases || [];
            const opsDetail = data.details?.operational || [];
            const arItems = data.arAging?.items || [];
            const apItems = data.apAging?.items || [];
            const topBuyers = data.topBuyers || [];
            const topSuppliers = data.topSuppliers || [];
            const returnPurchase = data.returnPurchaseSummary?.items || [];
            const returnSales = data.returnSalesSummary?.items || [];
            const financeStaff = data.staffActivity?.finance || [];
            const warehouseStaff = data.staffActivity?.warehouse || [];
            const expenseByCategory = pl.expenseByCategory || [];

            const totalTraceMargin = traceData.reduce((s: number, r: any) => s + Number(r.MARGIN || 0), 0);
            const totalTraceJual = traceData.reduce((s: number, r: any) => s + Number(r['TOTAL JUAL'] || 0), 0);
            const totalTraceBeli = traceData.reduce((s: number, r: any) => s + Number(r['TOTAL BELI'] || 0), 0);

            html = `
                <html>
                    <head>
                        <title>Laporan Closing Bulanan - ${periodLabel}</title>
                        ${getCommonStyles()}
                    </head>
                    <body>
                        <!-- ═══════════════════════════════════════════════════ -->
                        <!-- HALAMAN 1: RINGKASAN EKSEKUTIF (P&L)              -->
                        <!-- ═══════════════════════════════════════════════════ -->
                        ${getHeaderHTML('LAPORAN CLOSING BULANAN', periodLabel)}

                        <div class="summary-grid">
                            <div class="summary-card">
                                <p>Total Penjualan</p>
                                <h2 class="text-green">${formatCurrency(pl.revenue || 0)}</h2>
                            </div>
                            <div class="summary-card">
                                <p>Total Pembelian</p>
                                <h2 class="text-blue">${formatCurrency(data.purchases?.total || 0)}</h2>
                            </div>
                            <div class="summary-card">
                                <p>HPP (Harga Pokok)</p>
                                <h2>${formatCurrency(pl.hpp || 0)}</h2>
                            </div>
                            <div class="summary-card">
                                <p>Biaya Operasional</p>
                                <h2>${formatCurrency(pl.expenses || 0)}</h2>
                            </div>
                        </div>

                        <div class="summary-grid">
                            <div class="summary-card highlight">
                                <p>Gross Profit</p>
                                <h2 style="color: ${(pl.grossProfit || 0) >= 0 ? '#059669' : '#dc2626'}">${formatCurrency(pl.grossProfit || 0)}</h2>
                                <p style="margin-top: 2px; font-size: 8px;">Margin: ${pl.grossMarginPct || 0}%</p>
                            </div>
                            <div class="summary-card ${(pl.netProfit || 0) >= 0 ? 'highlight' : 'danger'}">
                                <p>Net Profit</p>
                                <h2 style="color: ${(pl.netProfit || 0) >= 0 ? '#059669' : '#dc2626'}">${formatCurrency(pl.netProfit || 0)}</h2>
                                <p style="margin-top: 2px; font-size: 8px;">Margin: ${pl.netMarginPct || 0}%</p>
                            </div>
                            <div class="summary-card">
                                <p>Piutang (AR)</p>
                                <h2 class="text-blue">${formatCurrency(data.arAging?.buckets?.total || 0)}</h2>
                            </div>
                            <div class="summary-card">
                                <p>Hutang (AP)</p>
                                <h2 class="text-red">${formatCurrency(data.apAging?.buckets?.total || 0)}</h2>
                            </div>
                        </div>

                        <h3>Ringkasan Statistik</h3>
                        <div class="summary-grid-6">
                            <div class="summary-card"><p>Jumlah SJ (Penjualan)</p><h2>${data.stats?.salesCount || 0}</h2></div>
                            <div class="summary-card"><p>Jumlah LPB (Pembelian)</p><h2>${data.stats?.purchaseCount || 0}</h2></div>
                            <div class="summary-card"><p>Jumlah Transaksi Finance</p><h2>${data.stats?.opsCount || 0}</h2></div>
                        </div>

                        <div class="two-col no-break">
                            <div>
                                <h3>Top 10 Buyer</h3>
                                <table>
                                    <thead><tr><th>Nama Customer</th><th class="text-right">SJ</th><th class="text-right">Total</th></tr></thead>
                                    <tbody>
                                        ${topBuyers.slice(0, 10).map((b: any) => `<tr><td class="font-black">${b.name}</td><td class="text-right">${b.count}</td><td class="text-right font-black">${formatCurrency(b.total)}</td></tr>`).join('')}
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <h3>Top 10 Supplier</h3>
                                <table>
                                    <thead><tr><th>Nama Supplier</th><th class="text-right">LPB</th><th class="text-right">Total</th></tr></thead>
                                    <tbody>
                                        ${topSuppliers.slice(0, 10).map((s: any) => `<tr><td class="font-black">${s.name}</td><td class="text-right">${s.count}</td><td class="text-right font-black">${formatCurrency(s.total)}</td></tr>`).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- ═══════════════════════════════════════════════════ -->
                        <!-- HALAMAN 2: DETAIL PENJUALAN                       -->
                        <!-- ═══════════════════════════════════════════════════ -->
                        <div class="section-divider"></div>
                        ${getMiniHeaderHTML('DETAIL PENJUALAN', periodLabel)}

                        <table>
                            <thead>
                                <tr>
                                    <th style="width:4%">No</th>
                                    <th style="width:10%">Tanggal</th>
                                    <th style="width:18%">No. SJ</th>
                                    <th style="width:22%">Buyer</th>
                                    <th style="width:6%">Div</th>
                                    <th class="text-right" style="width:6%">Qty</th>
                                    <th class="text-right" style="width:12%">Grand Total</th>
                                    <th class="text-right" style="width:10%">HPP</th>
                                    <th class="text-right" style="width:12%">Margin</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${salesDetail.map((s: any, i: number) => `
                                    <tr>
                                        <td>${i + 1}</td>
                                        <td>${format(new Date(s.date), "dd/MM/yy")}</td>
                                        <td class="font-black">${s.number}</td>
                                        <td>${s.buyer || '-'}</td>
                                        <td>${s.salesPerson || '-'}</td>
                                        <td class="text-right">${s.totalQty}</td>
                                        <td class="text-right font-black text-green">${formatCurrency(s.grandTotal)}</td>
                                        <td class="text-right">${formatCurrency(s.hpp || 0)}</td>
                                        <td class="text-right font-black" style="color: ${(s.margin || 0) >= 0 ? '#059669' : '#dc2626'}">${formatCurrency(s.margin || 0)} (${(s.marginPct || 0).toFixed(1)}%)</td>
                                    </tr>
                                `).join('')}
                                <tr class="total-row">
                                    <td colspan="5">TOTAL</td>
                                    <td class="text-right">${salesDetail.reduce((s: number, d: any) => s + (d.totalQty || 0), 0)}</td>
                                    <td class="text-right text-green">${formatCurrency(pl.revenue || 0)}</td>
                                    <td class="text-right">${formatCurrency(pl.hpp || 0)}</td>
                                    <td class="text-right" style="color: ${(pl.grossProfit || 0) >= 0 ? '#059669' : '#dc2626'}">${formatCurrency(pl.grossProfit || 0)}</td>
                                </tr>
                            </tbody>
                        </table>

                        <!-- ═══════════════════════════════════════════════════ -->
                        <!-- HALAMAN 3: DETAIL PEMBELIAN                       -->
                        <!-- ═══════════════════════════════════════════════════ -->
                        <div class="section-divider"></div>
                        ${getMiniHeaderHTML('DETAIL PEMBELIAN', periodLabel)}

                        <table>
                            <thead>
                                <tr>
                                    <th style="width:4%">No</th>
                                    <th style="width:10%">Tanggal</th>
                                    <th style="width:20%">No. LPB</th>
                                    <th style="width:26%">Supplier</th>
                                    <th style="width:6%">Div</th>
                                    <th class="text-right" style="width:12%">Subtotal</th>
                                    <th class="text-right" style="width:10%">Pajak</th>
                                    <th class="text-right" style="width:12%">Grand Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${purchaseDetail.map((p: any, i: number) => `
                                    <tr>
                                        <td>${i + 1}</td>
                                        <td>${format(new Date(p.date), "dd/MM/yy")}</td>
                                        <td class="font-black">${p.number}</td>
                                        <td>${p.supplier || '-'}</td>
                                        <td>${p.salesPerson || '-'}</td>
                                        <td class="text-right">${formatCurrency(p.subtotal)}</td>
                                        <td class="text-right">${formatCurrency(p.tax)}</td>
                                        <td class="text-right font-black text-blue">${formatCurrency(p.grandTotal)}</td>
                                    </tr>
                                `).join('')}
                                <tr class="total-row">
                                    <td colspan="5">TOTAL (${purchaseDetail.length} LPB)</td>
                                    <td class="text-right">${formatCurrency(data.purchases?.subtotal || 0)}</td>
                                    <td class="text-right">${formatCurrency(purchaseDetail.reduce((s: number, p: any) => s + (p.tax || 0), 0))}</td>
                                    <td class="text-right text-blue">${formatCurrency(data.purchases?.total || 0)}</td>
                                </tr>
                            </tbody>
                        </table>

                        <!-- ═══════════════════════════════════════════════════ -->
                        <!-- HALAMAN 4: TRACEABILITY / MARGIN                  -->
                        <!-- ═══════════════════════════════════════════════════ -->
                        <div class="section-divider"></div>
                        ${getMiniHeaderHTML('TRACEABILITY & MARGIN', periodLabel)}

                        <div class="summary-grid-6" style="margin-bottom: 12px;">
                            <div class="summary-card"><p>Total Beli (HPP)</p><h2>${formatCurrency(totalTraceBeli)}</h2></div>
                            <div class="summary-card"><p>Total Jual</p><h2 class="text-green">${formatCurrency(totalTraceJual)}</h2></div>
                            <div class="summary-card highlight"><p>Total Margin</p><h2 style="color: ${totalTraceMargin >= 0 ? '#059669' : '#dc2626'}">${formatCurrency(totalTraceMargin)} (${totalTraceJual > 0 ? (totalTraceMargin / totalTraceJual * 100).toFixed(1) : 0}%)</h2></div>
                        </div>

                        <table>
                            <thead>
                                <tr>
                                    <th style="width:3%">No</th>
                                    <th style="width:8%">Barcode</th>
                                    <th style="width:16%">Nama Item</th>
                                    <th style="width:12%">Supplier</th>
                                    <th style="width:8%">No. LPB</th>
                                    <th class="text-right" style="width:4%">Qty</th>
                                    <th class="text-right" style="width:10%">Total Beli</th>
                                    <th style="width:12%">Buyer</th>
                                    <th class="text-right" style="width:4%">Qty</th>
                                    <th class="text-right" style="width:10%">Total Jual</th>
                                    <th class="text-right" style="width:10%">Margin</th>
                                    <th class="text-right" style="width:4%">%</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${traceData.map((r: any) => `
                                    <tr>
                                        <td>${r.NO}</td>
                                        <td style="font-size:8px;">${r.BARCODE || '-'}</td>
                                        <td class="font-black" style="font-size:8px;">${r['KETERANGAN ITEM'] || '-'}</td>
                                        <td style="font-size:8px;">${r['NAMA SUPPLIER'] || '-'}</td>
                                        <td style="font-size:7px;">${r['NOMOR LPB'] || '-'}</td>
                                        <td class="text-right">${r['QTY BELI'] || 0}</td>
                                        <td class="text-right font-black">${formatCurrency(r['TOTAL BELI'] || 0)}</td>
                                        <td style="font-size:8px;">${r['NAMA PEMBELI'] || '-'}</td>
                                        <td class="text-right">${r['QTY JUAL'] || 0}</td>
                                        <td class="text-right font-black text-green">${formatCurrency(r['TOTAL JUAL'] || 0)}</td>
                                        <td class="text-right font-black" style="color: ${Number(r.MARGIN || 0) >= 0 ? '#059669' : '#dc2626'}">${formatCurrency(r.MARGIN || 0)}</td>
                                        <td class="text-right" style="font-size:8px;">${r['MARGIN %'] || '0%'}</td>
                                    </tr>
                                `).join('')}
                                <tr class="total-row">
                                    <td colspan="6">TOTAL (${traceData.length} baris)</td>
                                    <td class="text-right">${formatCurrency(totalTraceBeli)}</td>
                                    <td colspan="2"></td>
                                    <td class="text-right text-green">${formatCurrency(totalTraceJual)}</td>
                                    <td class="text-right" style="color: ${totalTraceMargin >= 0 ? '#059669' : '#dc2626'}">${formatCurrency(totalTraceMargin)}</td>
                                    <td class="text-right">${totalTraceJual > 0 ? (totalTraceMargin / totalTraceJual * 100).toFixed(1) : 0}%</td>
                                </tr>
                            </tbody>
                        </table>

                        <!-- ═══════════════════════════════════════════════════ -->
                        <!-- HALAMAN 5: OUTSTANDING (PIUTANG & HUTANG)         -->
                        <!-- ═══════════════════════════════════════════════════ -->
                        <div class="section-divider"></div>
                        ${getMiniHeaderHTML('PIUTANG & HUTANG OUTSTANDING', periodLabel)}

                        <h3>A. Piutang Usaha (Accounts Receivable)</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width:4%">No</th>
                                    <th style="width:16%">No. SJ</th>
                                    <th style="width:22%">Customer</th>
                                    <th style="width:10%">Tanggal</th>
                                    <th class="text-right" style="width:14%">Nilai</th>
                                    <th class="text-right" style="width:14%">Dibayar</th>
                                    <th class="text-right" style="width:14%">Sisa</th>
                                    <th class="text-right" style="width:6%">Hari</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${arItems.length > 0 ? arItems.map((r: any, i: number) => `
                                    <tr>
                                        <td>${i + 1}</td>
                                        <td class="font-black">${r.number}</td>
                                        <td>${r.partner || '-'}</td>
                                        <td>${format(new Date(r.date), "dd/MM/yy")}</td>
                                        <td class="text-right">${formatCurrency(r.grandTotal)}</td>
                                        <td class="text-right text-green">${formatCurrency(r.paidAmount)}</td>
                                        <td class="text-right font-black text-red">${formatCurrency(r.outstanding)}</td>
                                        <td class="text-right font-black" style="color: ${r.days > 30 ? '#dc2626' : '#0f172a'}">${r.days}</td>
                                    </tr>
                                `).join('') : '<tr><td colspan="8" class="text-center">Tidak ada piutang outstanding</td></tr>'}
                                ${arItems.length > 0 ? `<tr class="total-row">
                                    <td colspan="4">TOTAL PIUTANG (${arItems.length} nota)</td>
                                    <td class="text-right">${formatCurrency(arItems.reduce((s: number, r: any) => s + r.grandTotal, 0))}</td>
                                    <td class="text-right">${formatCurrency(arItems.reduce((s: number, r: any) => s + r.paidAmount, 0))}</td>
                                    <td class="text-right text-red">${formatCurrency(data.arAging?.buckets?.total || 0)}</td>
                                    <td></td>
                                </tr>` : ''}
                            </tbody>
                        </table>

                        <h3>B. Hutang Usaha (Accounts Payable)</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width:4%">No</th>
                                    <th style="width:16%">No. LPB</th>
                                    <th style="width:22%">Supplier</th>
                                    <th style="width:10%">Tanggal</th>
                                    <th class="text-right" style="width:14%">Nilai</th>
                                    <th class="text-right" style="width:14%">Dibayar</th>
                                    <th class="text-right" style="width:14%">Sisa</th>
                                    <th class="text-right" style="width:6%">Hari</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${apItems.length > 0 ? apItems.map((r: any, i: number) => `
                                    <tr>
                                        <td>${i + 1}</td>
                                        <td class="font-black">${r.number}</td>
                                        <td>${r.partner || '-'}</td>
                                        <td>${format(new Date(r.date), "dd/MM/yy")}</td>
                                        <td class="text-right">${formatCurrency(r.grandTotal)}</td>
                                        <td class="text-right text-green">${formatCurrency(r.paidAmount)}</td>
                                        <td class="text-right font-black text-red">${formatCurrency(r.outstanding)}</td>
                                        <td class="text-right font-black" style="color: ${r.days > 30 ? '#dc2626' : '#0f172a'}">${r.days}</td>
                                    </tr>
                                `).join('') : '<tr><td colspan="8" class="text-center">Tidak ada hutang outstanding</td></tr>'}
                                ${apItems.length > 0 ? `<tr class="total-row">
                                    <td colspan="4">TOTAL HUTANG (${apItems.length} nota)</td>
                                    <td class="text-right">${formatCurrency(apItems.reduce((s: number, r: any) => s + r.grandTotal, 0))}</td>
                                    <td class="text-right">${formatCurrency(apItems.reduce((s: number, r: any) => s + r.paidAmount, 0))}</td>
                                    <td class="text-right text-red">${formatCurrency(data.apAging?.buckets?.total || 0)}</td>
                                    <td></td>
                                </tr>` : ''}
                            </tbody>
                        </table>

                        <!-- ═══════════════════════════════════════════════════ -->
                        <!-- HALAMAN 6: LAPORAN FINANCE (BIAYA OPERASIONAL)    -->
                        <!-- ═══════════════════════════════════════════════════ -->
                        <div class="section-divider"></div>
                        ${getMiniHeaderHTML('LAPORAN KEUANGAN (FINANCE)', periodLabel)}

                        <h3>A. Rincian Biaya Operasional</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width:4%">No</th>
                                    <th style="width:10%">Tanggal</th>
                                    <th style="width:40%">Deskripsi</th>
                                    <th style="width:14%">Kategori</th>
                                    <th style="width:10%">Bank</th>
                                    <th class="text-right" style="width:14%">Nominal</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${opsDetail.filter((o: any) => o.amount < 0 || o.category === 'PAYMENT' || o.category === 'EXPENSE').map((o: any, i: number) => `
                                    <tr>
                                        <td>${i + 1}</td>
                                        <td>${format(new Date(o.date), "dd/MM/yy")}</td>
                                        <td style="font-size:8px;">${o.description || '-'}</td>
                                        <td>${o.category || '-'}</td>
                                        <td>${o.bank || '-'}</td>
                                        <td class="text-right font-black">${formatCurrency(Math.abs(o.amount))}</td>
                                    </tr>
                                `).join('') || '<tr><td colspan="6" class="text-center">Tidak ada biaya operasional</td></tr>'}
                                <tr class="total-row">
                                    <td colspan="5">TOTAL BIAYA OPERASIONAL</td>
                                    <td class="text-right text-red">${formatCurrency(pl.expenses || 0)}</td>
                                </tr>
                            </tbody>
                        </table>

                        <h3>B. Ringkasan Per Kategori Biaya</h3>
                        <table>
                            <thead><tr><th>Kategori</th><th class="text-right">Total</th></tr></thead>
                            <tbody>
                                ${expenseByCategory.map((c: any) => `<tr><td class="font-black">${c.name}</td><td class="text-right font-black">${formatCurrency(c.value)}</td></tr>`).join('')}
                            </tbody>
                        </table>

                        <!-- ═══════════════════════════════════════════════════ -->
                        <!-- HALAMAN 7: LAPORAN ADMIN (PURCHASE & WAREHOUSE)   -->
                        <!-- ═══════════════════════════════════════════════════ -->
                        <div class="section-divider"></div>
                        ${getMiniHeaderHTML('LAPORAN ADMIN PURCHASE & WAREHOUSE', periodLabel)}

                        <h3>A. Aktivitas Admin Finance</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Nama Admin</th>
                                    <th class="text-right">Jumlah Transaksi</th>
                                    <th class="text-right">Total Pembayaran</th>
                                    <th class="text-right">Total Penerimaan</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${financeStaff.length > 0 ? financeStaff.map((f: any) => `
                                    <tr>
                                        <td class="font-black">${f.name}</td>
                                        <td class="text-right">${f.count}</td>
                                        <td class="text-right text-red">${formatCurrency(f.paymentAmount)}</td>
                                        <td class="text-right text-green">${formatCurrency(f.receiptAmount)}</td>
                                    </tr>
                                `).join('') : '<tr><td colspan="4" class="text-center">Tidak ada data</td></tr>'}
                            </tbody>
                        </table>

                        <h3>B. Aktivitas Admin Warehouse</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Nama Admin</th>
                                    <th class="text-right">LPB Dibuat</th>
                                    <th class="text-right">LPB Diverifikasi</th>
                                    <th class="text-right">Total Qty Diterima</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${warehouseStaff.length > 0 ? warehouseStaff.map((w: any) => `
                                    <tr>
                                        <td class="font-black">${w.name}</td>
                                        <td class="text-right">${w.createdCount}</td>
                                        <td class="text-right">${w.verifiedCount}</td>
                                        <td class="text-right font-black">${w.totalQtyReceived}</td>
                                    </tr>
                                `).join('') : '<tr><td colspan="4" class="text-center">Tidak ada data</td></tr>'}
                            </tbody>
                        </table>

                        <!-- ═══════════════════════════════════════════════════ -->
                        <!-- HALAMAN 8: RETUR & PENUTUP                        -->
                        <!-- ═══════════════════════════════════════════════════ -->
                        <div class="section-divider"></div>
                        ${getMiniHeaderHTML('RETUR & RINGKASAN', periodLabel)}

                        <div class="two-col">
                            <div>
                                <h3>A. Retur Pembelian (${returnPurchase.length})</h3>
                                <table>
                                    <thead><tr><th>No. Retur</th><th>Tanggal</th><th>Supplier</th><th class="text-right">Qty</th></tr></thead>
                                    <tbody>
                                        ${returnPurchase.length > 0 ? returnPurchase.map((r: any) => `
                                            <tr>
                                                <td class="font-black">${r.returnNumber}</td>
                                                <td>${format(new Date(r.date), "dd/MM/yy")}</td>
                                                <td>${r.supplier || '-'}</td>
                                                <td class="text-right">${r.totalQty}</td>
                                            </tr>
                                        `).join('') : '<tr><td colspan="4" class="text-center">Tidak ada retur pembelian</td></tr>'}
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <h3>B. Retur Penjualan (${returnSales.length})</h3>
                                <table>
                                    <thead><tr><th>No. Retur</th><th>Tanggal</th><th>Buyer</th><th class="text-right">Qty</th></tr></thead>
                                    <tbody>
                                        ${returnSales.length > 0 ? returnSales.map((r: any) => `
                                            <tr>
                                                <td class="font-black">${r.returnNumber}</td>
                                                <td>${format(new Date(r.date), "dd/MM/yy")}</td>
                                                <td>${r.buyer || '-'}</td>
                                                <td class="text-right">${r.totalQty}</td>
                                            </tr>
                                        `).join('') : '<tr><td colspan="4" class="text-center">Tidak ada retur penjualan</td></tr>'}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        ${getFooterHTML()}
                    </body>
                </html>
            `;
        } else if (activeTab === "daily" && dailyData) {
            html = `
                <html>
                    <head>
                        <title>Laporan Harian - ${dailyData.period}</title>
                        ${getCommonStyles()}
                    </head>
                    <body>
                        ${getHeaderHTML('Laporan Harian', dailyData.period)}
                        <div class="summary-grid">
                            <div class="summary-card">
                                <p>Penjualan</p>
                                <h2>${formatCurrency(dailyData.totals?.sales || 0)}</h2>
                            </div>
                            <div class="summary-card">
                                <p>HPP</p>
                                <h2>${formatCurrency(dailyData.totals?.hpp || 0)}</h2>
                            </div>
                            <div class="summary-card">
                                <p>Pembelian</p>
                                <h2>${formatCurrency(dailyData.totals?.purchases || 0)}</h2>
                            </div>
                            <div class="summary-card" style="background: #f8fafc; border: 1px solid #3b82f6;">
                                <p style="color: #3b82f6;">Gross Profit</p>
                                <h2 style="color: ${(dailyData.totals?.sales - dailyData.totals?.hpp) >= 0 ? '#059669' : '#dc2626'}">${formatCurrency(dailyData.totals?.sales - dailyData.totals?.hpp)}</h2>
                            </div>
                        </div>

                        <h3>I. 10 Produk Terlaris Harian</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 50%;">Nama Produk</th>
                                    <th style="width: 25%; text-align: right;">Total Terjual (Qty)</th>
                                    <th style="width: 25%; text-align: right;">Total Nilai</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${dailyData.topProducts?.slice(0, 10).map((p: any) => `
                                    <tr>
                                        <td class="font-black">${p.name}</td>
                                        <td class="text-right">${p.totalQty}</td>
                                        <td class="text-right font-black">${formatCurrency(p.totalSales)}</td>
                                    </tr>
                                `).join('') || '<tr><td colspan="3" style="text-align:center">Tidak ada data produk</td></tr>'}
                            </tbody>
                        </table>

                        <h3>II. Detail Penjualan Harian</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 25%;">No. Invoice / SJ</th>
                                    <th style="width: 35%;">Nama Customer</th>
                                    <th style="width: 20%;" class="text-right">Tgl Transaksi</th>
                                    <th style="width: 20%;" class="text-right">Total Transaksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${dailyData.sales?.map((s: any) => `
                                    <tr>
                                        <td class="font-black">${s.deliveryNumber}</td>
                                        <td>${s.buyerName || '-'}</td>
                                        <td class="text-right">${format(new Date(s.date), "dd/MM/yyyy HH:mm")}</td>
                                        <td class="text-right font-black">${formatCurrency(s.grandTotal)}</td>
                                    </tr>
                                `).join('') || '<tr><td colspan="4" style="text-align:center">Tidak ada transaksi penjualan harian</td></tr>'}
                            </tbody>
                        </table>
                        
                        <h3>III. Detail Pembelian Harian</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 25%;">No. Penerimaan</th>
                                    <th style="width: 35%;">Nama Supplier</th>
                                    <th style="width: 20%;" class="text-right">Tgl Transaksi</th>
                                    <th style="width: 20%;" class="text-right">Total Tagihan</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${dailyData.purchases?.map((p: any) => `
                                    <tr>
                                        <td class="font-black">${p.receiptNumber}</td>
                                        <td>${p.receivedFrom || '-'}</td>
                                        <td class="text-right">${format(new Date(p.date || p.createdAt), "dd/MM/yyyy HH:mm")}</td>
                                        <td class="text-right font-black">${formatCurrency(p.grandTotal)}</td>
                                    </tr>
                                `).join('') || '<tr><td colspan="4" style="text-align:center">Tidak ada transaksi pembelian harian</td></tr>'}
                            </tbody>
                        </table>
                        ${getFooterHTML()}
                    </body>
                </html>
            `;
        } else if (activeTab === "weekly" && weeklyData) {
            html = `
                <html>
                    <head>
                        <title>Laporan Mingguan - ${weeklyData.period}</title>
                        ${getCommonStyles()}
                    </head>
                    <body>
                        ${getHeaderHTML('Laporan Mingguan', weeklyData.period)}
                        <div class="summary-grid">
                            <div class="summary-card">
                                <p>Total Penjualan</p>
                                <h2>${formatCurrency(weeklyData.totals?.sales || 0)}</h2>
                            </div>
                            <div class="summary-card">
                                <p>Total Pembelian</p>
                                <h2>${formatCurrency(weeklyData.totals?.purchases || 0)}</h2>
                            </div>
                            <div class="summary-card">
                                <p>Operasional</p>
                                <h2>${formatCurrency(weeklyData.totals?.opsExpense || 0)}</h2>
                            </div>
                            <div class="summary-card" style="background: #f8fafc; border: 1px solid #3b82f6;">
                                <p style="color: #3b82f6;">Gross Margin</p>
                                <h2 style="color: ${(weeklyData.totals?.sales - weeklyData.totals?.hpp) >= 0 ? '#059669' : '#dc2626'}">${formatCurrency(weeklyData.totals?.sales - weeklyData.totals?.hpp)}</h2>
                            </div>
                        </div>

                        <h3>I. Tren Pendapatan Harian (Senin - Minggu)</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 20%;">Hari / Tanggal</th>
                                    <th style="width: 15%; text-align: right;">Total Transaksi</th>
                                    <th style="width: 25%; text-align: right;">Total Penjualan</th>
                                    <th style="width: 20%; text-align: right;">HPP</th>
                                    <th style="width: 20%; text-align: right;">Gross Profit</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${weeklyData.dailyBreakdown?.map((d: any) => `
                                    <tr>
                                        <td class="font-black">${d.dayName}, ${d.dateLabel}</td>
                                        <td class="text-right">${d.salesCount}</td>
                                        <td class="text-right font-black" style="color: #059669;">${formatCurrency(d.sales)}</td>
                                        <td class="text-right">${formatCurrency(d.hpp)}</td>
                                        <td class="text-right font-black">${formatCurrency(d.sales - d.hpp)}</td>
                                    </tr>
                                `).join('') || '<tr><td colspan="5" style="text-align:center">Tidak ada data harian</td></tr>'}
                            </tbody>
                        </table>

                        <div style="display: grid; grid-template-cols: 1fr 1fr; gap: 40px;">
                            <div>
                                <h3>II. Top 5 Customer</h3>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Nama Customer</th>
                                            <th class="text-right">Total Nilai</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${weeklyData.topBuyers?.slice(0, 5).map((b: any) => `
                                            <tr>
                                                <td class="font-black">${b.name}</td>
                                                <td class="text-right font-black">${formatCurrency(b.total)}</td>
                                            </tr>
                                        `).join('') || '<tr><td colspan="2" style="text-align:center">Tidak ada data</td></tr>'}
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <h3>III. Top 5 Produk</h3>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Nama Produk</th>
                                            <th class="text-right">Qty Terjual</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${weeklyData.topProducts?.slice(0, 5).map((p: any) => `
                                            <tr>
                                                <td class="font-black">${p.name}</td>
                                                <td class="text-right font-black">${p.totalQty}</td>
                                            </tr>
                                        `).join('') || '<tr><td colspan="2" style="text-align:center">Tidak ada data</td></tr>'}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        ${getFooterHTML()}
                    </body>
                </html>
            `;
        } else if (activeTab === "monthly" && monthlyData) {
            html = `
                <html>
                    <head>
                        <title>Laporan Bulanan - ${monthlyData.period}</title>
                        ${getCommonStyles()}
                    </head>
                    <body>
                        ${getHeaderHTML('Laporan Bulanan', monthlyData.period)}
                        <div class="summary-grid">
                            <div class="summary-card">
                                <p>Total Penjualan</p>
                                <h2>${formatCurrency(monthlyData.totals?.sales || 0)}</h2>
                            </div>
                            <div class="summary-card">
                                <p>Total Pembelian</p>
                                <h2>${formatCurrency(monthlyData.totals?.purchases || 0)}</h2>
                            </div>
                            <div class="summary-card">
                                <p>Operasional</p>
                                <h2>${formatCurrency(monthlyData.totals?.opsExpense || 0)}</h2>
                            </div>
                            <div class="summary-card" style="background: #f8fafc; border: 1px solid #3b82f6;">
                                <p style="color: #3b82f6;">Gross Margin</p>
                                <h2 style="color: ${(monthlyData.totals?.sales - monthlyData.totals?.hpp) >= 0 ? '#059669' : '#dc2626'}">${formatCurrency(monthlyData.totals?.sales - monthlyData.totals?.hpp)}</h2>
                            </div>
                        </div>

                        <h3>I. Tren Kinerja Bulanan (Per Minggu)</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 25%;">Minggu</th>
                                    <th style="width: 25%; text-align: right;">Total Penjualan</th>
                                    <th style="width: 25%; text-align: right;">Total Pembelian</th>
                                    <th style="width: 25%; text-align: right;">Gross Profit</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(() => {
                                    const weeks: any[] = [];
                                    const days = monthlyData.dailyBreakdown || [];
                                    let currentWeek = { sales: 0, purchases: 0, hpp: 0, count: 0 };
                                    let weekNum = 1;
                                    
                                    days.forEach((d: any, index: number) => {
                                        currentWeek.sales += d.sales;
                                        currentWeek.purchases += d.purchases;
                                        currentWeek.hpp += d.hpp;
                                        currentWeek.count++;
                                        
                                        if (currentWeek.count === 7 || index === days.length - 1) {
                                            weeks.push({ week: 'Minggu Ke-' + weekNum, ...currentWeek });
                                            currentWeek = { sales: 0, purchases: 0, hpp: 0, count: 0 };
                                            weekNum++;
                                        }
                                    });

                                    return weeks.map(w => `
                                        <tr>
                                            <td class="font-black">${w.week}</td>
                                            <td class="text-right font-black" style="color: #059669;">${formatCurrency(w.sales)}</td>
                                            <td class="text-right">${formatCurrency(w.purchases)}</td>
                                            <td class="text-right font-black">${formatCurrency(w.sales - w.hpp)}</td>
                                        </tr>
                                    `).join('');
                                })()}
                            </tbody>
                        </table>

                        <div style="page-break-before: always;"></div>

                        <h3>II. Top 10 Customer Terbesar</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 50%;">Nama Customer</th>
                                    <th style="width: 25%; text-align: right;">Jumlah Transaksi</th>
                                    <th style="width: 25%; text-align: right;">Total Nilai Pembelian</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${monthlyData.topBuyers?.slice(0, 10).map((b: any) => `
                                    <tr>
                                        <td class="font-black">${b.name}</td>
                                        <td class="text-right">${b.count}</td>
                                        <td class="text-right font-black">${formatCurrency(b.total)}</td>
                                    </tr>
                                `).join('') || '<tr><td colspan="3" style="text-align:center">Tidak ada data</td></tr>'}
                            </tbody>
                        </table>

                        <h3>III. Top 10 Produk Terlaris</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 50%;">Nama Produk</th>
                                    <th style="width: 25%; text-align: right;">Total Qty Terjual</th>
                                    <th style="width: 25%; text-align: right;">Total Pendapatan</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${monthlyData.topProducts?.slice(0, 10).map((p: any) => `
                                    <tr>
                                        <td class="font-black">${p.name}</td>
                                        <td class="text-right">${p.totalQty}</td>
                                        <td class="text-right font-black">${formatCurrency(p.totalSales)}</td>
                                    </tr>
                                `).join('') || '<tr><td colspan="3" style="text-align:center">Tidak ada data</td></tr>'}
                            </tbody>
                        </table>

                        ${getFooterHTML()}
                    </body>
                </html>
            `;
        } else {
            printWindow.close();
            window.print();
            return;
        }

        printWindow.document.write(html);
        printWindow.document.close();
    };

    useEffect(() => {
        if (activeTab === 'daily') fetchDaily();
        else if (activeTab === 'weekly') fetchWeekly();
        else if (activeTab === 'monthly') fetchMonthly();
        else if (activeTab === 'closing') {
            fetchClosingReport(closingPeriod.month, closingPeriod.year, closingPrefix);
            // Sync selectedMonth/Year and activePrefix with closingPeriod so fetchMonthly uses the correct period & prefix for print
            setSelectedMonth(closingPeriod.month);
            setSelectedYear(closingPeriod.year);
            setActivePrefix(closingPrefix);
        }
    }, [activeTab, fetchDaily, fetchWeekly, fetchMonthly, closingPeriod, closingPrefix]);

    // When on closing tab, also fetch comprehensive monthly data for print (synced to closingPeriod)
    useEffect(() => {
        if (activeTab === 'closing') {
            fetchMonthly();
        }
    }, [activeTab, selectedMonth, selectedYear, fetchMonthly]);

    // ── Helpers ───────────────────────────────────────────────────────────
    const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
    const fmtShortDate = (d: any) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '-';

    const navigateDate = (dir: number) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + dir);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    const navigateWeek = (dir: number) => {
        const d = new Date(selectedWeekStart);
        d.setDate(d.getDate() + (dir * 7));
        setSelectedWeekStart(d.toISOString().split('T')[0]);
    };

    const navigateMonth = (dir: number) => {
        let m = selectedMonth + dir;
        let y = selectedYear;
        if (m > 12) { m = 1; y++; }
        if (m < 1) { m = 12; y--; }
        setSelectedMonth(m);
        setSelectedYear(y);
    };

    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    // ── Export Excel ──────────────────────────────────────────────────────
    const handleExportExcel = () => {
        const wb = XLSX.utils.book_new();
        const data = activeTab === 'daily' ? dailyData : activeTab === 'weekly' ? weeklyData : monthlyData;
        if (!data) return;

        if (activeTab === 'daily' && data.details) {
            // Sales sheet
            if (data.details.sales?.length) {
                const rows = data.details.sales.map((s: any, i: number) => ({
                    'No': i + 1, 'No. Invoice': s.invoiceNumber || s.number, 'No. Surat Jalan': s.number, 'Tanggal': fmtDate(s.date),
                    'Buyer': s.buyer, 'Sales': s.salesPerson || '-',
                    'Qty': s.totalQty, 'Subtotal': s.subtotal, 'Diskon': s.discount,
                    'PPN': s.tax, 'Grand Total': s.grandTotal,
                    'HPP': s.hpp, 'Margin': s.margin, 'Margin %': `${s.marginPct?.toFixed(1) || 0}%`,
                    'Dibayar': s.paidAmount, 'Status': s.paymentStatus,
                    'Operator': s.operator
                }));
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Penjualan');
            }
            // Purchase sheet
            if (data.details.purchases?.length) {
                const rows = data.details.purchases.map((p: any, i: number) => ({
                    'No': i + 1, 'No. LPB': p.number, 'Tanggal': fmtDate(p.date),
                    'Supplier': p.supplier, 'Gudang': p.warehouse || '-',
                    'Qty': p.totalQty, 'Subtotal': p.subtotal, 'Diskon': p.discount,
                    'PPN': p.tax, 'Grand Total': p.grandTotal,
                    'Dibayar': p.paidAmount, 'Status': p.paymentStatus,
                    'Operator': p.operator
                }));
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Pembelian');
            }
            // Operational sheet
            if (data.details.operational?.length) {
                const rows = data.details.operational.map((o: any, i: number) => ({
                    'No': i + 1, 'Tanggal': fmtDate(o.date), 'Keterangan': o.description,
                    'Bank': o.bank, 'Kategori': o.category, 'Jumlah': o.amount,
                    'Sales': o.salesPerson || '-', 'Operator': o.operator
                }));
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Operasional');
            }
            // Stock Movements sheet
            if (data.details.stockMovements?.length) {
                const rows = data.details.stockMovements.map((m: any, i: number) => ({
                    'No': i + 1, 'Waktu': fmtDate(m.date), 'SKU': m.sku,
                    'Produk': m.productName, 'Gudang': m.warehouse,
                    'Tipe': m.type, 'Qty': m.quantity, 'Referensi': m.reference
                }));
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Pergerakan Stok');
            }
            // Traceability Harian sheet
            if (data.details.dailyTraceability?.length) {
                const rows = data.details.dailyTraceability.map((r: any) => ({
                    'No': r.NO,
                    'Barcode': r.BARCODE,
                    'Nama Item': r['KETERANGAN ITEM'],
                    'Supplier': r['NAMA SUPPLIER'],
                    'No. LPB': r['NOMOR LPB'],
                    'Tgl Beli': r['TANGGAL BELI'],
                    'Total Beli (HPP)': r['TOTAL BELI'],
                    'Ops': r.OPS,
                    'Buyer': r['NAMA PEMBELI'],
                    'Sales': r.SALES || '-',
                    'No. Faktur Penjualan': r['NOMOR FAKTUR PENJUALAN'],
                    'No. Surat Jalan': r['NOMOR SJ'],
                    'Tgl Jual': r['TANGGAL JUAL'],
                    'Total Jual (Net)': r['TOTAL JUAL'],
                    'Margin': r.MARGIN,
                    'Margin %': r['MARGIN %']
                }));
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Traceability Harian');
            }
        }

        if (activeTab === 'weekly' && data.dailyBreakdown) {
            const rows = data.dailyBreakdown.map((d: any) => ({
                'Hari': d.dayName,
                'Tanggal': d.dateLabel,
                'Pembelian': d.purchases,
                'Penjualan': d.sales,
                'Ops': d.opsExpense,
                'Jumlah Surat Pembelian': d.purchaseCount,
                'Jumlah Surat Penjualan': d.salesCount,
                'Qty Jual': d.salesQty,
                'Qty Beli': d.purchaseQty,
                'Margin': d.sales - d.hpp - d.opsExpense
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Breakdown Harian');

            // Traceability Mingguan
            if (data.details?.weeklyTraceability?.length) {
                const traceRows = data.details.weeklyTraceability.map((r: any) => ({
                    'No.': r.NO,
                    'Barcode': r.BARCODE,
                    'Nama Item': r['KETERANGAN ITEM'],
                    'Supplier': r['NAMA SUPPLIER'],
                    'No. LPB': r['NOMOR LPB'],
                    'Tgl Beli': r['TANGGAL BELI'],
                    'Qty Beli': r['QTY BELI'],
                    'Total Beli (HPP)': r['TOTAL BELI'],
                    'Ops': r.OPS,
                    'Buyer': r['NAMA PEMBELI'],
                    'Sales': r.SALES,
                    'No. Faktur Penjualan': r['NOMOR FAKTUR PENJUALAN'],
                    'No. Surat Jalan': r['NOMOR SJ'],
                    'Tgl Jual': r['TANGGAL JUAL'],
                    'Qty Jual': r['QTY JUAL'],
                    'Total Jual (Net)': r['TOTAL JUAL'],
                    'Margin': r.MARGIN,
                    'Margin %': r['MARGIN %'] || '0%'
                }));
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(traceRows), 'Traceability Mingguan');
            }
            if (data.topBuyers?.length)
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.topBuyers), 'Top Buyer');
            if (data.topSuppliers?.length)
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.topSuppliers), 'Top Supplier');
        }

        if (activeTab === 'monthly' && data.profitLoss) {
            // P&L sheet
            const plRows = [
                { 'Keterangan': 'PENDAPATAN (Revenue)', 'Jumlah (Rp)': data.profitLoss.revenue },
                { 'Keterangan': '  Subtotal Penjualan', 'Jumlah (Rp)': data.profitLoss.revenueSubtotal },
                { 'Keterangan': '  Diskon', 'Jumlah (Rp)': -data.profitLoss.discount },
                { 'Keterangan': '  PPN', 'Jumlah (Rp)': data.profitLoss.salesTax },
                { 'Keterangan': '', 'Jumlah (Rp)': '' },
                { 'Keterangan': 'HARGA POKOK PENJUALAN (HPP)', 'Jumlah (Rp)': data.profitLoss.hpp },
                { 'Keterangan': '', 'Jumlah (Rp)': '' },
                { 'Keterangan': 'LABA KOTOR', 'Jumlah (Rp)': data.profitLoss.grossProfit },
                { 'Keterangan': `  Margin Kotor (${data.profitLoss.grossMarginPct}%)`, 'Jumlah (Rp)': '' },
                { 'Keterangan': '', 'Jumlah (Rp)': '' },
                { 'Keterangan': 'BIAYA OPERASIONAL', 'Jumlah (Rp)': data.profitLoss.expenses },
                ...(data.profitLoss.expenseByCategory || []).map((c: any) => ({
                    'Keterangan': `  ${c.name}`, 'Jumlah (Rp)': c.value
                })),
                { 'Keterangan': '', 'Jumlah (Rp)': '' },
                { 'Keterangan': 'LABA BERSIH', 'Jumlah (Rp)': data.profitLoss.netProfit },
                { 'Keterangan': `  Margin Bersih (${data.profitLoss.netMarginPct}%)`, 'Jumlah (Rp)': '' },
            ];
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(plRows), 'Laba Rugi');

            // Details
            if (data.details?.sales?.length) {
                const rows = data.details.sales.map((s: any, i: number) => ({
                    'No': i + 1, 'No. Penjualan': s.invoiceNumber || s.number, 'No. Surat Jalan': s.number,
                    'Buyer': s.buyer, 'Alamat': s.alamat || '-', 'Gudang': s.gudang || '-',
                    'Qty': s.totalQty, 'Total Jual': s.grandTotal,
                    'Tanggal': fmtDate(s.date), 'Status': s.paymentStatus
                }));
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Detail Penjualan');
            }
            if (data.details?.purchases?.length) {
                const rows = data.details.purchases.map((p: any, i: number) => ({
                    'No': i + 1, 'No. LPB': p.number, 'Tanggal': fmtDate(p.date),
                    'Supplier': p.supplier, 'Grand Total': p.grandTotal, 'Status': p.paymentStatus
                }));
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Detail Pembelian');
            }
            if (data.details?.operational?.length) {
                const rows = data.details.operational.map((o: any, i: number) => ({
                    'No': i + 1, 'Tanggal': fmtDate(o.date), 'Keterangan': o.description,
                    'Bank': o.bank, 'Kategori': o.category, 'Jumlah': o.amount
                }));
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Detail Operasional');
            }
            if (data.details?.monthlyTraceability?.length) {
                const traceRows = data.details.monthlyTraceability.map((r: any) => ({
                    'No.': r.NO,
                    'Barcode': r.BARCODE,
                    'Nama Item': r['KETERANGAN ITEM'],
                    'Supplier': r['NAMA SUPPLIER'],
                    'No. LPB': r['NOMOR LPB'],
                    'Tgl Beli': r['TANGGAL BELI'],
                    'Qty Beli': r['QTY BELI'],
                    'Total Beli (HPP)': r['TOTAL BELI'],
                    'Ops': r.OPS,
                    'Buyer': r['NAMA PEMBELI'],
                    'Sales': r.SALES,
                    'No. Faktur Penjualan': r['NOMOR FAKTUR PENJUALAN'],
                    'No. Surat Jalan': r['NOMOR SJ'],
                    'Tgl Jual': r['TANGGAL JUAL'],
                    'Qty Jual': r['QTY JUAL'],
                    'Total Jual (Net)': r['TOTAL JUAL'],
                    'Margin': r.MARGIN,
                    'Margin %': r['MARGIN %'] || '0%'
                }));
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(traceRows), 'Traceability Bulanan');
            }
            // AR
            if (data.arAging?.items?.length) {
                const rows = data.arAging.items.map((r: any, i: number) => ({
                    'No': i + 1, 'No. SJ': r.number, 'Buyer': r.partner,
                    'Tanggal': fmtDate(r.date), 'Grand Total': r.grandTotal,
                    'Dibayar': r.paidAmount, 'Outstanding': r.outstanding,
                    'Hari': r.days, 'Aging': r.bucket
                }));
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Piutang (AR)');
            }
            // AP
            if (data.apAging?.items?.length) {
                const rows = data.apAging.items.map((r: any, i: number) => ({
                    'No': i + 1, 'No. LPB': r.number, 'Supplier': r.partner,
                    'Tanggal': fmtDate(r.date), 'Grand Total': r.grandTotal,
                    'Dibayar': r.paidAmount, 'Outstanding': r.outstanding,
                    'Hari': r.days, 'Aging': r.bucket
                }));
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Hutang (AP)');
            }
        }

        // Closing Bulanan Excel Export — uses monthlyData (comprehensive)
        if (activeTab === 'closing' && monthlyData) {
            const cData = monthlyData;
            const cPl = cData.profitLoss || {};

            // P&L sheet
            const plRows = [
                { 'Keterangan': 'PENDAPATAN (Revenue)', 'Jumlah (Rp)': cPl.revenue },
                { 'Keterangan': '  Subtotal Penjualan', 'Jumlah (Rp)': cPl.revenueSubtotal },
                { 'Keterangan': '  Diskon', 'Jumlah (Rp)': -(cPl.discount || 0) },
                { 'Keterangan': '  PPN', 'Jumlah (Rp)': cPl.salesTax },
                { 'Keterangan': '', 'Jumlah (Rp)': '' },
                { 'Keterangan': 'HARGA POKOK PENJUALAN (HPP)', 'Jumlah (Rp)': cPl.hpp },
                { 'Keterangan': '', 'Jumlah (Rp)': '' },
                { 'Keterangan': 'LABA KOTOR', 'Jumlah (Rp)': cPl.grossProfit },
                { 'Keterangan': `  Margin Kotor (${cPl.grossMarginPct || 0}%)`, 'Jumlah (Rp)': '' },
                { 'Keterangan': '', 'Jumlah (Rp)': '' },
                { 'Keterangan': 'BIAYA OPERASIONAL', 'Jumlah (Rp)': cPl.expenses },
                ...(cPl.expenseByCategory || []).map((c: any) => ({
                    'Keterangan': `  ${c.name}`, 'Jumlah (Rp)': c.value
                })),
                { 'Keterangan': '', 'Jumlah (Rp)': '' },
                { 'Keterangan': 'LABA BERSIH', 'Jumlah (Rp)': cPl.netProfit },
                { 'Keterangan': `  Margin Bersih (${cPl.netMarginPct || 0}%)`, 'Jumlah (Rp)': '' },
            ];
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(plRows), 'Laba Rugi');

            // Detail Penjualan
            if (cData.details?.sales?.length) {
                const rows = cData.details.sales.map((s: any, i: number) => ({
                    'No': i + 1, 'No. SJ': s.number, 'Tanggal': fmtDate(s.date),
                    'Buyer': s.buyer, 'Div': s.salesPerson || '-',
                    'Qty': s.totalQty, 'Grand Total': s.grandTotal,
                    'HPP': s.hpp, 'Margin': s.margin,
                    'Margin %': s.marginPct ? `${s.marginPct.toFixed(1)}%` : '0%',
                    'Dibayar': s.paidAmount, 'Status': s.paymentStatus
                }));
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Detail Penjualan');
            }

            // Detail Pembelian
            if (cData.details?.purchases?.length) {
                const rows = cData.details.purchases.map((p: any, i: number) => ({
                    'No': i + 1, 'No. LPB': p.number, 'Tanggal': fmtDate(p.date),
                    'Supplier': p.supplier, 'Div': p.salesPerson || '-',
                    'Subtotal': p.subtotal, 'Pajak': p.tax,
                    'Grand Total': p.grandTotal, 'Status': p.paymentStatus
                }));
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Detail Pembelian');
            }

            // Detail Operasional
            if (cData.details?.operational?.length) {
                const rows = cData.details.operational.map((o: any, i: number) => ({
                    'No': i + 1, 'Tanggal': fmtDate(o.date), 'Keterangan': o.description,
                    'Bank': o.bank, 'Kategori': o.category, 'Jumlah': o.amount
                }));
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Detail Operasional');
            }

            // Traceability
            if (cData.details?.monthlyTraceability?.length) {
                const traceRows = cData.details.monthlyTraceability.map((r: any) => ({
                    'No.': r.NO,
                    'Barcode': r.BARCODE,
                    'Nama Item': r['KETERANGAN ITEM'],
                    'Supplier': r['NAMA SUPPLIER'],
                    'No. LPB': r['NOMOR LPB'],
                    'Tgl Beli': r['TANGGAL BELI'],
                    'Qty Beli': r['QTY BELI'],
                    'Total Beli (HPP)': r['TOTAL BELI'],
                    'Ops': r.OPS,
                    'Buyer': r['NAMA PEMBELI'],
                    'Sales': r.SALES,
                    'No. Faktur': r['NOMOR FAKTUR PENJUALAN'],
                    'No. SJ': r['NOMOR SJ'],
                    'Tgl Jual': r['TANGGAL JUAL'],
                    'Qty Jual': r['QTY JUAL'],
                    'Total Jual': r['TOTAL JUAL'],
                    'Margin': r.MARGIN,
                    'Margin %': r['MARGIN %'] || '0%'
                }));
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(traceRows), 'Traceability');
            }

            // Piutang (AR)
            if (cData.arAging?.items?.length) {
                const rows = cData.arAging.items.map((r: any, i: number) => ({
                    'No': i + 1, 'No. SJ': r.number, 'Customer': r.partner,
                    'Tanggal': fmtDate(r.date), 'Nilai': r.grandTotal,
                    'Dibayar': r.paidAmount, 'Sisa': r.outstanding,
                    'Umur (Hari)': r.days, 'Aging': r.bucket
                }));
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Piutang (AR)');
            }

            // Hutang (AP)
            if (cData.apAging?.items?.length) {
                const rows = cData.apAging.items.map((r: any, i: number) => ({
                    'No': i + 1, 'No. LPB': r.number, 'Supplier': r.partner,
                    'Tanggal': fmtDate(r.date), 'Nilai': r.grandTotal,
                    'Dibayar': r.paidAmount, 'Sisa': r.outstanding,
                    'Umur (Hari)': r.days, 'Aging': r.bucket
                }));
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Hutang (AP)');
            }

            // Admin Finance
            if (cData.staffActivity?.finance?.length) {
                const rows = cData.staffActivity.finance.map((f: any) => ({
                    'Nama Admin': f.name, 'Jumlah Transaksi': f.count,
                    'Total Pembayaran': f.paymentAmount, 'Total Penerimaan': f.receiptAmount
                }));
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Admin Finance');
            }

            // Admin Warehouse
            if (cData.staffActivity?.warehouse?.length) {
                const rows = cData.staffActivity.warehouse.map((w: any) => ({
                    'Nama Admin': w.name, 'LPB Dibuat': w.createdCount,
                    'LPB Diverifikasi': w.verifiedCount, 'Total Qty Diterima': w.totalQtyReceived
                }));
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Admin Warehouse');
            }

            // Top Buyers & Suppliers
            if (cData.topBuyers?.length)
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cData.topBuyers), 'Top Buyer');
            if (cData.topSuppliers?.length)
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cData.topSuppliers), 'Top Supplier');
        }

        const prefixSuffix = activePrefix !== 'ALL' ? `_${activePrefix}` : '';
        const tabLabel = activeTab === 'daily' ? `Harian_${selectedDate}` : activeTab === 'weekly' ? `Mingguan_${selectedWeekStart}` : activeTab === 'closing' ? `Closing_${monthNames[closingPeriod.month - 1]}_${closingPeriod.year}` : `Bulanan_${monthNames[selectedMonth - 1]}_${selectedYear}`;
        XLSX.writeFile(wb, `Laporan_${tabLabel}${prefixSuffix}.xlsx`);
    };

    // ═══════════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════════
    return (
        <div className="space-y-8 pb-16 animate-fade-up">
            {/* ── HEADER ────────────────────────────────────────────── */}
            <div className="erp-card overflow-hidden">
                <div className="bg-slate-900 text-white px-8 py-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(59,130,246,0.15),transparent_60%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(16,185,129,0.1),transparent_60%)]" />
                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
                                    <BarChart3 className="h-5 w-5 text-blue-400" />
                                </div>
                                <div>
                                <h1 className="text-2xl font-black tracking-tight uppercase">Pusat Laporan</h1>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Reporting Center — Semua Modul</p>
                                </div>
                            </div>
                        </div>
                        {activeTab !== 'closing' && (
                            <div className="flex items-center gap-3">
                                <select
                                    value={activePrefix}
                                    onChange={e => setActivePrefix(e.target.value as any)}
                                    className="bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10 outline-none cursor-pointer"
                                >
                                    <option value="ALL" className="text-slate-900 bg-white font-black">ALL DIV</option>
                                    <option value="PF" className="text-slate-900 bg-white font-black">PF DIV</option>
                                    <option value="BC" className="text-slate-900 bg-white font-black">BC DIV</option>
                                </select>
                                <button
                                    onClick={() => window.print()}
                                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10"
                                >
                                    <Printer className="h-4 w-4" /><span>Print</span>
                                </button>
                                <button
                                    onClick={handleExportExcel}
                                    disabled={isLoading}
                                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                                >
                                    <FileSpreadsheet className="h-4 w-4" /><span>Export Excel</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── TAB NAVIGATION ─────────────────────────────────── */}
                <div className="flex border-b border-slate-100">
                    {([
                        { key: 'daily' as ReportTab, label: 'Harian', icon: Calendar },
                        { key: 'weekly' as ReportTab, label: 'Mingguan', icon: Activity },
                        { key: 'monthly' as ReportTab, label: 'Bulanan', icon: BarChart3 },
                        { key: 'closing' as ReportTab, label: 'Closing Bulanan', icon: FileCode2 },
                    ]).map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={cn(
                                "flex-1 py-4 px-6 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 relative",
                                activeTab === tab.key
                                    ? "border-slate-900 text-slate-900 bg-slate-50/50"
                                    : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50/30"
                            )}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ── PERIOD PICKER ──────────────────────────────────── */}
                {activeTab !== 'closing' && (
                    <div className="px-6 py-4 bg-slate-50/30 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button onClick={() => {
                            if (activeTab === 'daily') navigateDate(-1);
                            else if (activeTab === 'weekly') navigateWeek(-1);
                            else navigateMonth(-1);
                        }} className="h-9 w-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors">
                            <ChevronLeft className="h-4 w-4 text-slate-600" />
                        </button>

                        {activeTab === 'daily' && (
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={e => setSelectedDate(e.target.value)}
                                className="erp-input !w-auto !h-9 !py-1 !text-xs font-black"
                            />
                        )}
                        {activeTab === 'weekly' && (
                            <div className="bg-white border-2 border-slate-200/80 px-4 py-1.5 rounded-xl text-xs font-black text-slate-900">
                                {weeklyData?.period?.label || `Minggu ${fmtShortDate(selectedWeekStart)}`}
                            </div>
                        )}
                        {activeTab === 'monthly' && (
                            <div className="flex items-center gap-2">
                                <select
                                    value={selectedMonth}
                                    onChange={e => setSelectedMonth(Number(e.target.value))}
                                    className="erp-input !w-auto !h-9 !py-1 !text-xs font-black"
                                >
                                    {monthNames.map((m, i) => (
                                        <option key={i} value={i + 1}>{m}</option>
                                    ))}
                                </select>
                                <select
                                    value={selectedYear}
                                    onChange={e => setSelectedYear(Number(e.target.value))}
                                    className="erp-input !w-auto !h-9 !py-1 !text-xs font-black"
                                >
                                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <button onClick={() => {
                            if (activeTab === 'daily') navigateDate(1);
                            else if (activeTab === 'weekly') navigateWeek(1);
                            else navigateMonth(1);
                        }} className="h-9 w-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors">
                            <ChevronRight className="h-4 w-4 text-slate-600" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {isLoading && (
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Memuat...
                            </div>
                        )}
                        <button
                            onClick={() => {
                                if (activeTab === 'daily') fetchDaily();
                                else if (activeTab === 'weekly') fetchWeekly();
                                else fetchMonthly();
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            <RefreshCw className="h-3 w-3" /> Refresh
                        </button>
                    </div>
                </div>
            )}
            </div>

            {/* ── CONTENT ───────────────────────────────────────────── */}
            {isLoading && !dailyData && !weeklyData && !monthlyData && activeTab !== 'closing' ? (
                <div className="erp-card p-20 flex flex-col items-center justify-center gap-4">
                    <RefreshCw className="h-8 w-8 text-slate-300 animate-spin" />
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Mengambil data laporan...</p>
                </div>
            ) : (
                <>
                    <TraceabilityReallocateModal
                        isOpen={isTraceModalOpen}
                        onClose={() => {
                            setIsTraceModalOpen(false);
                            if (activeTab === 'daily') fetchDaily();
                            if (activeTab === 'weekly') fetchWeekly();
                            if (activeTab === 'monthly') fetchMonthly();
                        }}
                        data={selectedTraceData}
                    />
                    {activeTab === 'daily' && dailyData && <DailyReport data={dailyData} isClient={isClient} fmtDate={fmtDate} activePrefix={activePrefix} setActivePrefix={setActivePrefix} setIsTraceModalOpen={setIsTraceModalOpen} setSelectedTraceData={setSelectedTraceData} />}
                    {activeTab === 'weekly' && weeklyData && <WeeklyReport data={weeklyData} isClient={isClient} fmtDate={fmtDate} activePrefix={activePrefix} setActivePrefix={setActivePrefix} setIsTraceModalOpen={setIsTraceModalOpen} setSelectedTraceData={setSelectedTraceData} />}
                    {activeTab === 'monthly' && monthlyData && <MonthlyReport data={monthlyData} isClient={isClient} fmtDate={fmtDate} activePrefix={activePrefix} setActivePrefix={setActivePrefix} setIsTraceModalOpen={setIsTraceModalOpen} setSelectedTraceData={setSelectedTraceData} />}
                    
                    {activeTab === "closing" && (
                        <div className="space-y-8 animate-in fade-in zoom-in duration-500">
                            <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-4 bg-primary/10 rounded-[1.5rem] text-primary">
                                        <Calendar className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Period Closing Report</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Consolidated Financial Review</p>
                                        {closingReport?.debug && (
                                            <p className="text-[8px] font-mono text-slate-300 mt-2">
                                                DEBUG: Sales({closingReport.debug.salesCount}) Items({closingReport.debug.totalItemsInSales}) Prices({closingReport.debug.priceMapSize})
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                                    <select 
                                        value={closingPrefix}
                                        onChange={(e) => setClosingPrefix(e.target.value as any)}
                                        className="bg-transparent font-black text-sm outline-none px-4 py-2 border-r border-slate-200"
                                    >
                                        <option value="ALL">ALL DIV</option>
                                        <option value="PF">PF DIV</option>
                                        <option value="BC">BC DIV</option>
                                    </select>
                                    <select 
                                        value={closingPeriod.month}
                                        onChange={(e) => setClosingPeriod(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                                        className="bg-transparent font-black text-sm outline-none px-4 py-2"
                                    >
                                        {Array.from({ length: 12 }).map((_, i) => (
                                            <option key={i+1} value={i+1}>{format(new Date(2024, i, 1), "MMMM")}</option>
                                        ))}
                                    </select>
                                    <select 
                                        value={closingPeriod.year}
                                        onChange={(e) => setClosingPeriod(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                                        className="bg-transparent font-black text-sm outline-none px-4 py-2"
                                    >
                                        {[2024, 2025, 2026].map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                    <button 
                                        onClick={() => fetchClosingReport(closingPeriod.month, closingPeriod.year, closingPrefix)}
                                        disabled={isFetchingClosing}
                                        className="p-2 bg-white rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95 text-primary"
                                    >
                                        <Search className={cn("h-5 w-5", isFetchingClosing && "animate-spin")} />
                                    </button>
                                </div>
                            </div>

                            {isFetchingClosing ? (
                                <div className="p-32 text-center bg-white rounded-[2.5rem] border-2 border-slate-50 shadow-inner flex flex-col items-center justify-center gap-6 animate-pulse">
                                    <div className="p-4 bg-primary/5 rounded-full">
                                        <Clock className="h-12 w-12 text-primary/30 animate-spin" />
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-900 uppercase tracking-[0.2em] text-sm">Menarik Data Closing</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Mohon tunggu sebentar, sedang sinkronisasi data seluruh departemen...</p>
                                    </div>
                                </div>
                            ) : !closingReport ? (
                                <div className="p-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 text-slate-300">
                                    <p className="font-black uppercase tracking-widest text-xs">Pilih periode dan klik cari untuk memuat data closing</p>
                                </div>
                            ) : closingReport.error ? (
                                <div className="p-20 text-center bg-rose-50 rounded-[2.5rem] border-2 border-dashed border-rose-100 text-rose-400">
                                    <p className="font-black uppercase tracking-widest text-xs">Gagal Memuat Data: {closingReport.error}</p>
                                    <button onClick={() => fetchClosingReport(closingPeriod.month, closingPeriod.year, closingPrefix)} className="mt-4 px-6 py-2 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Coba Lagi</button>
                                </div>
                            ) : (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    {/* Metric Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                                        {[
                                            { label: "Penjualan", value: closingReport.revenue, color: "text-emerald-500", icon: ArrowUpCircle, type: 'sales', data: closingReport.details?.sales || [] },
                                            { label: "Pembelian", value: closingReport.inventory?.purchases || 0, color: "text-blue-500", icon: ShoppingCart, type: 'purchases', data: closingReport.details?.purchases || [] },
                                            { label: "Operasional", value: closingReport.expenses, color: "text-amber-500", icon: Wallet, type: 'operational', data: closingReport.details?.operational || [] },
                                            { label: "Gross Margin", value: closingReport.grossProfit, color: "text-emerald-600", icon: Sparkles, type: 'none', data: [] },
                                            { label: "Profit", value: closingReport.netProfit, color: "text-indigo-600", icon: Banknote, type: 'none', data: [] },
                                        ].map((card, i) => (
                                            <div 
                                                key={i} 
                                                onClick={() => card.type !== 'none' ? setDrillDownData({ title: `Rincian ${card.label}`, data: card.data, type: card.type }) : undefined}
                                                className={cn("bg-white p-6 rounded-3xl border-2 border-slate-50 shadow-sm transition-all group", card.type !== 'none' && "cursor-pointer hover:shadow-md hover:border-slate-200")}
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={cn("p-2 bg-slate-50 rounded-xl transition-colors group-hover:bg-primary/5", card.color.replace('text-', 'text-opacity-20 '))}>
                                                        <card.icon className="h-4 w-4" />
                                                    </div>
                                                </div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                                                <p className={cn("text-xl font-black tabular-nums tracking-tighter", card.color)}>
                                                    {formatCurrency(card.value)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        <div className="lg:col-span-2 space-y-6">
                                            <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 overflow-hidden">
                                                <div className="p-8 border-b border-slate-50 bg-slate-50/50">
                                                    <h4 className="font-black text-slate-900 uppercase tracking-tight">Outstanding Balances (End of Period)</h4>
                                                </div>
                                                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-end">
                                                            <div>
                                                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Piutang (AR)</p>
                                                                <p 
                                                                    onClick={() => setDrillDownData({ title: 'Rincian Piutang (AR)', data: closingReport.arAging?.items || [], type: 'ar' })}
                                                                    className="text-2xl font-black text-slate-900 tabular-nums tracking-tighter cursor-pointer hover:underline"
                                                                >
                                                                    {formatCurrency(closingReport.outstandingAR)}
                                                                </p>
                                                            </div>
                                                            <ArrowUpCircle className="h-8 w-8 text-emerald-100" />
                                                        </div>
                                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-emerald-500 w-[65%]" />
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Menunggu penagihan dari customer aktif</p>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-end">
                                                            <div>
                                                                <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Total Hutang (AP)</p>
                                                                <p 
                                                                    onClick={() => setDrillDownData({ title: 'Rincian Hutang (AP)', data: closingReport.apAging?.items || [], type: 'ap' })}
                                                                    className="text-2xl font-black text-slate-900 tabular-nums tracking-tighter cursor-pointer hover:underline"
                                                                >
                                                                    {formatCurrency(closingReport.outstandingAP)}
                                                                </p>
                                                            </div>
                                                            <ArrowDownCircle className="h-8 w-8 text-rose-100" />
                                                        </div>
                                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-rose-500 w-[45%]" />
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Hutang berjalan ke supplier barang</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden flex flex-col justify-between">
                                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                                <Sparkles className="h-32 w-32" />
                                            </div>
                                            <div className="relative z-10">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Operational Insight</p>
                                                <h4 className="text-2xl font-black tracking-tight">Closing Efficiency</h4>
                                                <p className="text-sm text-slate-400 mt-4 leading-relaxed">
                                                    Periode ini memiliki <strong>{closingReport.stats.salesCount}</strong> transaksi penjualan dan <strong>{closingReport.stats.purchaseCount}</strong> penerimaan barang.
                                                </p>
                                            </div>
                                            <div className="relative z-10 mt-12 space-y-4">
                                                <button 
                                                    onClick={() => handlePrint()}
                                                    className="w-full py-4 bg-white text-slate-900 font-black rounded-2xl hover:bg-slate-100 transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                                                >
                                                    <Printer className="h-4 w-4" />
                                                    Cetak Laporan Closing
                                                </button>
                                                <button 
                                                    onClick={downloadPurchasesExcel}
                                                    className="w-full py-4 bg-emerald-500 text-white font-black rounded-2xl hover:bg-emerald-600 transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg animate-fade-up"
                                                >
                                                    <Download className="h-4 w-4" />
                                                    Download Excel Pembelian
                                                </button>
                                                <button 
                                                    onClick={downloadSalesExcel}
                                                    className="w-full py-4 bg-blue-500 text-white font-black rounded-2xl hover:bg-blue-600 transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg animate-fade-up"
                                                >
                                                    <Download className="h-4 w-4" />
                                                    Download Excel Penjualan
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
            {drillDownData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">{drillDownData.title}</h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Total {drillDownData.data.length} data</p>
                            </div>
                            <button onClick={() => setDrillDownData(null)} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
                                <X className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto bg-white flex-1 custom-scrollbar">
                            <table className="w-full text-left text-xs table-fixed min-w-[600px]">
                                <thead className="text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                                    <tr>
                                        <th className="pb-3 w-12">No</th>
                                        <th className="pb-3 w-1/4">Ref / No. Dokumen</th>
                                        <th className="pb-3 w-1/3">Keterangan / Entitas</th>
                                        <th className="pb-3 text-right">Nominal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-slate-600">
                                    {drillDownData.data.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-3 font-bold">{idx + 1}</td>
                                            <td className="py-3 font-black text-slate-900 truncate">
                                                {drillDownData.type === 'operational' ? item.bank || '-' : item.number || '-'}
                                            </td>
                                            <td className="py-3 truncate max-w-[200px]" title={item.description || item.buyer || item.supplier || item.partner || ''}>
                                                {item.description || item.buyer || item.supplier || item.partner || '-'}
                                            </td>
                                            <td className="py-3 text-right font-black text-slate-900 tabular-nums">
                                                {formatCurrency(item.amount || item.grandTotal || item.outstanding || 0)}
                                            </td>
                                        </tr>
                                    ))}
                                    {drillDownData.data.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="py-8 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                                                Tidak ada data
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


// ═══════════════════════════════════════════════════════════════════════════
// DAILY REPORT SUB-COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
function DailyReport({ data, isClient, fmtDate, activePrefix, setActivePrefix, setIsTraceModalOpen, setSelectedTraceData }: { data: any; isClient: boolean; fmtDate: (d: any) => string; activePrefix: 'PF' | 'BC' | 'ALL'; setActivePrefix: (val: 'PF' | 'BC' | 'ALL') => void; setIsTraceModalOpen?: any; setSelectedTraceData?: any }) {
    if (data.error) return <ErrorCard message={data.error} />;
    const s = data.summary || {};
    const d = data.details || {};

    const divisionFilterSelect = (
        <select
            value={activePrefix}
            onChange={e => setActivePrefix(e.target.value as any)}
            className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider cursor-pointer outline-none shadow-sm text-slate-800"
        >
            <option value="ALL">ALL DIV</option>
            <option value="PF">PF DIV</option>
            <option value="BC">BC DIV</option>
        </select>
    );

    return (
        <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <KPICard icon={<ShoppingBag className="h-5 w-5 text-blue-500" />} label="Penjualan" value={formatCurrency(s.totalSales || 0)} sub={`${s.salesCount || 0} Invoice • ${s.totalSalesQty || 0} Unit`} color="blue" isClient={isClient} />
                <KPICard icon={<ShoppingCart className="h-5 w-5 text-emerald-500" />} label="Pembelian" value={formatCurrency(s.totalPurchases || 0)} sub={`${s.purchaseCount || 0} LPB • ${s.totalPurchaseQty || 0} Unit`} color="emerald" isClient={isClient} />
                <KPICard icon={<Wallet className="h-5 w-5 text-amber-500" />} label="Biaya Operasional" value={formatCurrency(s.totalExpense || 0)} sub={`${s.opsCount || 0} Transaksi`} color="amber" isClient={isClient} />
                <KPICard icon={<TrendingUp className="h-5 w-5 text-purple-500" />} label="Laba Bersih (Margin)" value={formatCurrency(s.netProfit || 0)} sub={`M. Bersih: ${s.netMarginPct?.toFixed(1) || 0}% • M. Kotor: ${s.grossMarginPct?.toFixed(1) || 0}% (${formatCurrency(s.grossProfit || 0)})`} color="purple" trend={s.netProfit >= 0 ? 'up' : 'down'} isClient={isClient} />
            </div>

            {/* Payment Status Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <MiniStat label="SJ Lunas" value={s.salesPaid || 0} icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} />
                <MiniStat label="SJ Pending" value={s.salesPending || 0} icon={<Clock className="h-4 w-4 text-amber-500" />} />
                <MiniStat label="LPB Lunas" value={s.purchasePaid || 0} icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} />
                <MiniStat label="LPB Pending" value={s.purchasePending || 0} icon={<Clock className="h-4 w-4 text-amber-500" />} />
            </div>

            {/* Sales Table */}
            {d.sales?.length > 0 && (
                <ReportTable
                    title="Detail Penjualan" icon={<ShoppingBag className="h-4 w-4 text-blue-500" />}
                    count={d.sales.length} totalLabel="Total Penjualan" totalValue={formatCurrency(s.totalSales || 0)}
                    headers={['No. Penjualan', 'No. Surat Jalan', 'Buyer', 'Alamat', 'Gudang', 'Qty', 'Total Jual', 'Biaya Ops', 'Tanggal', 'Status']}
                    rows={d.sales.map((row: any) => [
                        <span className="font-black text-blue-700">{row.invoiceNumber || row.number}</span>,
                        <span className="font-mono text-slate-500 text-xs">{row.number}</span>,
                        <span className="truncate max-w-[140px] block font-bold">{row.buyer}</span>,
                        <span className="truncate max-w-[150px] block text-xs text-slate-500">{row.alamat || '-'}</span>,
                        <span className="text-[10px] font-black uppercase text-slate-600 bg-slate-100 px-2 py-1 rounded">{row.gudang || '-'}</span>,
                        <span className="tabular-nums font-black">{row.totalQty}</span>,
                        <span className="tabular-nums font-black text-emerald-600">{isClient ? formatCurrency(row.grandTotal) : '...'}</span>,
                        <span className={cn("tabular-nums font-black", row.hasOps ? "text-amber-600" : "text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded")}>
                            {isClient ? (row.hasOps ? formatCurrency(row.opsAmount) : 'Belum Ada') : '...'}
                        </span>,
                        <span className="text-xs text-slate-500">{fmtDate(row.date)}</span>,
                        <PaymentBadge status={row.paymentStatus} />
                    ])}
                    isClient={isClient}
                    actions={divisionFilterSelect}
                />
            )}

            {/* Traceability Harian */}
            {d.dailyTraceability?.length > 0 && (
                <ReportTable
                    title="Traceability Harian" icon={<FileSpreadsheet className="h-4 w-4 text-emerald-500" />}
                    count={d.dailyTraceability.length}
                    totalLabel="Margin Traceability"
                    totalValue={isClient ? (() => {
                        const totalJual = d.dailyTraceability.reduce((sum: number, r: any) => sum + Number(r['TOTAL JUAL'] || 0), 0);
                        const totalMargin = d.dailyTraceability.reduce((sum: number, r: any) => sum + Number(r.MARGIN || 0), 0);
                        const marginPct = totalJual > 0 ? (totalMargin / totalJual * 100) : 0;
                        return `${formatCurrency(totalMargin)} (${marginPct.toFixed(1)}%)`;
                    })() : '...'}
                    headers={['No.', 'Barcode', 'Nama Item', 'Supplier', 'No. LPB', 'Tgl Beli', 'Qty Beli', 'Total Beli (HPP)', 'Ops', 'Buyer', 'Sales', 'No. Faktur Penjualan', 'No. Surat Jalan', 'Tgl Jual', 'Qty Jual', 'Total Jual (Net)', 'Margin', 'Margin %', 'Aksi']}
                    rows={d.dailyTraceability.map((row: any) => [
                        <span className="font-bold">{row.NO}</span>,
                        row.BARCODE,
                        <span className="truncate max-w-[150px] block font-bold" title={row['KETERANGAN ITEM']}>{row['KETERANGAN ITEM']}</span>,
                        <span className="truncate max-w-[130px] block" title={row['NAMA SUPPLIER']}>{row['NAMA SUPPLIER']}</span>,
                        <span className="font-semibold">{row['NOMOR LPB']}</span>,
                        row['TANGGAL BELI'],
                        <span className="tabular-nums font-bold text-slate-700">{row['QTY BELI']}</span>,
                        <span className="tabular-nums font-bold text-rose-600">{isClient ? formatCurrency(row['TOTAL BELI']) : '...'}</span>,
                        <span className="tabular-nums font-bold text-amber-600">{isClient ? formatCurrency(row.OPS) : '...'}</span>,
                        <span className="truncate max-w-[130px] block" title={row['NAMA PEMBELI']}>{row['NAMA PEMBELI']}</span>,
                        row.SALES || '-',
                        <span className="font-black text-slate-900">{row['NOMOR FAKTUR PENJUALAN']}</span>,
                        <span className="font-semibold text-slate-600">{row['NOMOR SJ']}</span>,
                        row['TANGGAL JUAL'],
                        <span className="tabular-nums font-bold text-slate-700">{row['QTY JUAL']}</span>,
                        <span className="tabular-nums font-bold text-blue-600">{isClient ? formatCurrency(row['TOTAL JUAL']) : '...'}</span>,
                        <span className={cn("tabular-nums font-black", row.MARGIN >= 0 ? "text-emerald-600" : "text-rose-600")}>
                            {isClient ? formatCurrency(row.MARGIN) : '...'}
                        </span>,
                        <span className={cn("font-black", row.MARGIN >= 0 ? "text-emerald-600" : "text-rose-600")}>
                            {row['MARGIN %']}
                        </span>,
                        row.__DATA__ ? (
                            <button
                                onClick={() => {
                                    setSelectedTraceData({
                                        sdItemId: row.__DATA__.sdItemId,
                                        productId: row.__DATA__.productId,
                                        currentLotId: row.__DATA__.currentLotId,
                                        productName: row['KETERANGAN ITEM'],
                                        buyerName: row['NAMA BUYER'],
                                        sjNumber: row['NOMOR SJ'],
                                        qty: row['QTY JUAL']
                                    });
                                    setIsTraceModalOpen(true);
                                }}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Ubah Rujukan Pembelian (Lot)"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                        ) : <span className="text-xs text-slate-400">-</span>
                    ])}
                    isClient={isClient}
                />
            )}

            {/* Purchase Table */}
            {d.purchases?.length > 0 && (
                <ReportTable
                    title="Detail Pembelian" icon={<ShoppingCart className="h-4 w-4 text-emerald-500" />}
                    count={d.purchases.length} totalLabel="Total Pembelian" totalValue={formatCurrency(s.totalPurchases || 0)}
                    headers={['No. LPB', 'Supplier', 'Gudang', 'Qty', 'Grand Total', 'Dibayar', 'Status', 'Operator']}
                    rows={d.purchases.map((row: any) => [
                        <span className="font-black text-slate-900">{row.number}</span>,
                        <span className="truncate max-w-[140px] block">{row.supplier}</span>,
                        row.warehouse || '-',
                        <span className="tabular-nums font-black">{row.totalQty}</span>,
                        <span className="tabular-nums font-black">{isClient ? formatCurrency(row.grandTotal) : '...'}</span>,
                        <span className="tabular-nums">{isClient ? formatCurrency(row.paidAmount) : '...'}</span>,
                        <PaymentBadge status={row.paymentStatus} />,
                        <span className="text-slate-400">{row.operator}</span>
                    ])}
                    isClient={isClient}
                    actions={divisionFilterSelect}
                />
            )}

            {/* Operational Table */}
            {d.operational?.length > 0 && (
                <ReportTable
                    title="Detail Operasional" icon={<Wallet className="h-4 w-4 text-amber-500" />}
                    count={d.operational.length}
                    headers={['Keterangan', 'Bank', 'Kategori', 'Sales', 'Jumlah', 'Operator']}
                    rows={d.operational.map((row: any) => [
                        <span className="truncate max-w-[200px] block font-bold">{row.description}</span>,
                        row.bank || '-',
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-slate-100 rounded">{row.category}</span>,
                        row.salesPerson || '-',
                        <span className={cn("tabular-nums font-black", row.amount >= 0 ? "text-emerald-600" : "text-rose-600")}>
                            {isClient ? formatCurrency(row.amount) : '...'}
                        </span>,
                        <span className="text-slate-400">{row.operator}</span>
                    ])}
                    isClient={isClient}
                />
            )}

            {/* Stock Movements */}
            {d.stockMovements?.length > 0 && (
                <ReportTable
                    title="Pergerakan Stok" icon={<Package className="h-4 w-4 text-purple-500" />}
                    count={d.stockMovements.length}
                    headers={['SKU', 'Produk', 'Gudang', 'Tipe', 'Qty', 'Referensi']}
                    rows={d.stockMovements.map((row: any) => [
                        <span className="font-black">{row.sku}</span>,
                        <span className="truncate max-w-[160px] block">{row.productName}</span>,
                        row.warehouse,
                        <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded",
                            row.type === 'IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        )}>{row.type === 'IN' ? 'MASUK' : 'KELUAR'}</span>,
                        <span className="tabular-nums font-black">{row.quantity}</span>,
                        <span className="text-slate-400 truncate max-w-[120px] block">{row.reference || '-'}</span>
                    ])}
                    isClient={isClient}
                />
            )}

            {/* Returns + Audit */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {(d.returnsPurchase?.length > 0 || d.returnsSales?.length > 0) && (
                    <div className="erp-card p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <RotateCcw className="h-4 w-4 text-rose-500" />
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Retur Hari Ini</h3>
                        </div>
                        {d.returnsPurchase?.length > 0 && (
                            <div className="mb-3">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Retur Pembelian ({d.returnsPurchase.length})</p>
                                {d.returnsPurchase.map((r: any, i: number) => (
                                    <div key={i} className="flex justify-between py-1.5 border-b border-slate-50 text-[11px]">
                                        <span className="font-black">{r.returnNumber}</span>
                                        <span className="text-slate-500">{r.supplier}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {d.returnsSales?.length > 0 && (
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Retur Penjualan ({d.returnsSales.length})</p>
                                {d.returnsSales.map((r: any, i: number) => (
                                    <div key={i} className="flex justify-between py-1.5 border-b border-slate-50 text-[11px]">
                                        <span className="font-black">{r.returnNumber}</span>
                                        <span className="text-slate-500">{r.buyer}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {d.auditLogs?.length > 0 && (
                    <div className="erp-card p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Shield className="h-4 w-4 text-indigo-500" />
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Audit Log</h3>
                            <span className="text-[9px] font-bold text-slate-400 ml-auto">{d.auditLogs.length} aktivitas</span>
                        </div>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {d.auditLogs.map((a: any, i: number) => (
                                <div key={i} className="flex items-start gap-3 py-2 border-b border-slate-50 text-[11px]">
                                    <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                                        <Users className="h-3.5 w-3.5 text-slate-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-slate-900">{a.user}</span>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase">{a.action}</span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 truncate">{a.resource} {a.resourceId ? `(${a.resourceId.slice(-6)})` : ''}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Staff Activity */}
            <StaffActivitySection data={data} isClient={isClient} />

            {/* Empty State */}
            {!d.sales?.length && !d.purchases?.length && !d.operational?.length && (
                <EmptyState message="Belum ada transaksi pada tanggal ini" />
            )}
        </div>
    );
}


// ═══════════════════════════════════════════════════════════════════════════
// WEEKLY REPORT SUB-COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
function WeeklyReport({ data, isClient, fmtDate, activePrefix, setActivePrefix, setIsTraceModalOpen, setSelectedTraceData }: { data: any; isClient: boolean; fmtDate: (d: any) => string; activePrefix: 'PF' | 'BC' | 'ALL'; setActivePrefix: (val: 'PF' | 'BC' | 'ALL') => void; setIsTraceModalOpen?: any; setSelectedTraceData?: any }) {
    if (data.error) return <ErrorCard message={data.error} />;
    const s = data.summary || {};
    const breakdown = data.dailyBreakdown || [];

    const divisionFilterSelect = (
        <select
            value={activePrefix}
            onChange={e => setActivePrefix(e.target.value as any)}
            className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider cursor-pointer outline-none shadow-sm text-slate-800"
        >
            <option value="ALL">ALL DIV</option>
            <option value="PF">PF DIV</option>
            <option value="BC">BC DIV</option>
        </select>
    );

    return (
        <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-5">
                <KPICard icon={<ShoppingBag className="h-5 w-5 text-blue-500" />} label="Total Penjualan" value={formatCurrency(s.totalSales || 0)} sub={`${s.salesCount || 0} Invoice`} color="blue" isClient={isClient} />
                <KPICard icon={<ShoppingCart className="h-5 w-5 text-emerald-500" />} label="Total Pembelian" value={formatCurrency(s.totalPurchases || 0)} sub={`${s.purchaseCount || 0} LPB`} color="emerald" isClient={isClient} />
                <KPICard icon={<Wallet className="h-5 w-5 text-amber-500" />} label="Biaya Operasional" value={formatCurrency(s.totalExpenses || 0)} sub={`${s.opsCount || 0} Transaksi`} color="amber" isClient={isClient} />
                <KPICard icon={<TrendingUp className="h-5 w-5 text-purple-500" />} label="Laba Kotor" value={formatCurrency(s.grossProfit || 0)} sub={`M. Kotor: ${s.grossMarginPct?.toFixed(1) || 0}%`} color="purple" trend={s.grossProfit >= 0 ? 'up' : 'down'} isClient={isClient} />
                <KPICard icon={<DollarSign className="h-5 w-5 text-indigo-500" />} label="Laba Bersih" value={formatCurrency(s.netProfit || 0)} sub={`M. Bersih: ${s.netMarginPct?.toFixed(1) || 0}% • Kotor - Ops`} color="indigo" trend={s.netProfit >= 0 ? 'up' : 'down'} isClient={isClient} />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bar Chart — Sales vs Purchase */}
                <div className="erp-card p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Penjualan vs Pembelian</h3>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Per Hari (7 Hari)</p>
                        </div>
                    </div>
                    <div className="h-[250px]">
                        {isClient && (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={breakdown} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="dateLabel" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 800 }} tickFormatter={(v: number) => `${(v / 1000000).toFixed(0)}jt`} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '8px 12px', fontSize: '11px' }}
                                        formatter={(value: any) => [formatCurrency(Number(value || 0)), '']}
                                    />
                                    <Bar dataKey="sales" name="Penjualan" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                                    <Bar dataKey="purchases" name="Pembelian" fill="#10b981" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Sales by Team Pie */}
                <div className="erp-card p-6 bg-slate-900 text-white">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-tight">Penjualan per Tim</h3>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Komposisi Revenue</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="h-[200px]">
                            {isClient && s.salesByTeam && (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'BC', value: s.salesByTeam.BC || 0 },
                                                { name: 'PF', value: s.salesByTeam.PF || 0 },
                                                { name: 'Lainnya', value: s.salesByTeam.Other || 0 }
                                            ].filter(d => d.value > 0)}
                                            cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                                            paddingAngle={5} dataKey="value" stroke="none"
                                        >
                                            {[CHART_COLORS[0], CHART_COLORS[4], CHART_COLORS[2]].map((c, i) => (
                                                <Cell key={i} fill={c} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                        <div className="flex flex-col justify-center space-y-4">
                            {[
                                { name: 'Team BC', value: s.salesByTeam?.BC || 0, color: CHART_COLORS[0] },
                                { name: 'Team PF', value: s.salesByTeam?.PF || 0, color: CHART_COLORS[4] },
                                { name: 'Lainnya', value: s.salesByTeam?.Other || 0, color: CHART_COLORS[2] },
                            ].map(t => (
                                <div key={t.name} className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2.5 w-5 rounded-full" style={{ backgroundColor: t.color }} />
                                        <span className="text-[10px] font-black text-slate-400 uppercase">{t.name}</span>
                                    </div>
                                    <span className="text-xs font-black tabular-nums">{isClient ? formatCurrency(t.value) : '...'}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Daily Breakdown Table */}
            <ReportTable
                title="Breakdown Harian" icon={<Calendar className="h-4 w-4 text-blue-500" />}
                count={breakdown.length}
                headers={['Hari', 'Tanggal', 'Pembelian', 'Penjualan', 'Ops', 'Jumlah Surat Pembelian', 'Jumlah Surat Penjualan', 'Qty Jual', 'Qty Beli', 'Margin']}
                rows={breakdown.map((row: any) => [
                    <span className="font-black">{row.dayName}</span>,
                    row.dateLabel,
                    <span className="tabular-nums font-black text-emerald-600">{isClient ? formatCurrency(row.purchases) : '...'}</span>,
                    <span className="tabular-nums font-black text-blue-600">{isClient ? formatCurrency(row.sales) : '...'}</span>,
                    <span className="tabular-nums text-amber-600">{isClient ? formatCurrency(row.opsExpense) : '...'}</span>,
                    <span className="tabular-nums font-black">{row.purchaseCount}</span>,
                    <span className="tabular-nums font-black">{row.salesCount}</span>,
                    <span className="tabular-nums">{row.salesQty}</span>,
                    <span className="tabular-nums">{row.purchaseQty}</span>,
                    <span className={cn("tabular-nums font-black", (row.sales - row.hpp - row.opsExpense) >= 0 ? "text-emerald-600" : "text-rose-600")}>
                        {isClient ? formatCurrency(row.sales - row.hpp - row.opsExpense) : '...'}
                    </span>
                ])}
                isClient={isClient}
                actions={divisionFilterSelect}
            />

            {/* Traceability Mingguan */}
            {data.details?.weeklyTraceability?.length > 0 && (
                <ReportTable
                    title="Traceability Mingguan" icon={<FileSpreadsheet className="h-4 w-4 text-emerald-500" />}
                    count={data.details.weeklyTraceability.length}
                    totalLabel="Margin Traceability"
                    totalValue={isClient ? (() => {
                        const totalJual = data.details.weeklyTraceability.reduce((sum: number, r: any) => sum + Number(r['TOTAL JUAL'] || 0), 0);
                        const totalMargin = data.details.weeklyTraceability.reduce((sum: number, r: any) => sum + Number(r.MARGIN || 0), 0);
                        const marginPct = totalJual > 0 ? (totalMargin / totalJual * 100) : 0;
                        return `${formatCurrency(totalMargin)} (${marginPct.toFixed(1)}%)`;
                    })() : '...'}
                    exportData={{
                        filename: 'traceability-mingguan',
                        data: data.details.weeklyTraceability
                    }}
                    headers={['No.', 'Barcode', 'Nama Item', 'Supplier', 'No. LPB', 'Tgl Beli', 'Qty Beli', 'Total Beli (HPP)', 'Ops', 'Buyer', 'Sales', 'No. Faktur Penjualan', 'No. Surat Jalan', 'Tgl Jual', 'Qty Jual', 'Total Jual (Net)', 'Margin', 'Margin %', 'Aksi']}
                    rows={data.details.weeklyTraceability.map((row: any) => [
                        <span className="font-bold">{row.NO}</span>,
                        row.BARCODE,
                        <span className="font-black text-slate-900 truncate max-w-[200px] block" title={row['KETERANGAN ITEM']}>{row['KETERANGAN ITEM']}</span>,
                        <span className="truncate max-w-[130px] block" title={row['NAMA SUPPLIER']}>{row['NAMA SUPPLIER']}</span>,
                        <span className="font-semibold">{row['NOMOR LPB']}</span>,
                        row['TANGGAL BELI'],
                        row['QTY BELI'],
                        <span className="tabular-nums text-rose-600">{isClient ? formatCurrency(row['TOTAL BELI']) : '...'}</span>,
                        <span className="tabular-nums text-amber-600">{isClient ? formatCurrency(row.OPS || 0) : '...'}</span>,
                        <span className="font-semibold truncate max-w-[130px] block" title={row['NAMA PEMBELI']}>{row['NAMA PEMBELI']}</span>,
                        row.SALES,
                        <span className="font-semibold text-xs">{row['NOMOR FAKTUR PENJUALAN']}</span>,
                        <span className="font-semibold text-xs text-slate-500">{row['NOMOR SJ']}</span>,
                        row['TANGGAL JUAL'],
                        row['QTY JUAL'],
                        <span className="tabular-nums font-black text-blue-600">{isClient ? formatCurrency(row['TOTAL JUAL']) : '...'}</span>,
                        <span className={cn("tabular-nums font-black", Number(row.MARGIN) >= 0 ? "text-emerald-600" : "text-rose-600")}>
                            {isClient ? formatCurrency(row.MARGIN) : '...'}
                        </span>,
                        <span className={cn("tabular-nums font-black", Number(row.MARGIN) >= 0 ? "text-emerald-600" : "text-rose-600")}>
                            {row['MARGIN %'] || '0%'}
                        </span>
                    ])}
                    isClient={isClient}
                />
            )}

            {/* Top Buyers + Top Suppliers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {data.topBuyers?.length > 0 && (
                    <div className="erp-card p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Building className="h-4 w-4 text-blue-500" />
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Top Buyer</h3>
                        </div>
                        <div className="space-y-3">
                            {data.topBuyers.map((b: any, i: number) => {
                                const maxVal = data.topBuyers[0]?.total || 1;
                                return (
                                    <div key={i} className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-bold text-slate-700 truncate max-w-[200px]">{b.name}</span>
                                            <span className="text-[11px] font-black tabular-nums">{isClient ? formatCurrency(b.total) : '...'}</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(b.total / maxVal) * 100}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                {data.topSuppliers?.length > 0 && (
                    <div className="erp-card p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Truck className="h-4 w-4 text-emerald-500" />
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Top Supplier</h3>
                        </div>
                        <div className="space-y-3">
                            {data.topSuppliers.map((s: any, i: number) => {
                                const maxVal = data.topSuppliers[0]?.total || 1;
                                return (
                                    <div key={i} className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-bold text-slate-700 truncate max-w-[200px]">{s.name}</span>
                                            <span className="text-[11px] font-black tabular-nums">{isClient ? formatCurrency(s.total) : '...'}</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(s.total / maxVal) * 100}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Expense by Category */}
            {data.expenseByCategory?.length > 0 && (
                <div className="erp-card p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <CreditCard className="h-4 w-4 text-amber-500" />
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Biaya per Kategori</h3>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {data.expenseByCategory.map((cat: any, i: number) => (
                            <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate">{cat.name}</p>
                                <p className="text-lg font-black text-slate-900 tabular-nums tracking-tighter">{isClient ? formatCurrency(cat.value) : '...'}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Staff Activity */}
            <StaffActivitySection data={data} isClient={isClient} />
        </div>
    );
}


// ═══════════════════════════════════════════════════════════════════════════
// MONTHLY REPORT SUB-COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
function MonthlyReport({ data, isClient, fmtDate, activePrefix, setActivePrefix, setIsTraceModalOpen, setSelectedTraceData }: { data: any; isClient: boolean; fmtDate: (d: any) => string; activePrefix: 'PF' | 'BC' | 'ALL'; setActivePrefix: (val: 'PF' | 'BC' | 'ALL') => void; setIsTraceModalOpen?: any; setSelectedTraceData?: any }) {
    if (data.error) return <ErrorCard message={data.error} />;
    const pl = data.profitLoss || {};
    const stats = data.stats || {};

    const divisionFilterSelect = (
        <select
            value={activePrefix}
            onChange={e => setActivePrefix(e.target.value as any)}
            className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider cursor-pointer outline-none shadow-sm text-slate-800"
        >
            <option value="ALL">ALL DIV</option>
            <option value="PF">PF DIV</option>
            <option value="BC">BC DIV</option>
        </select>
    );

    return (
        <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <KPICard icon={<ShoppingBag className="h-5 w-5 text-blue-500" />} label="Total Revenue" value={formatCurrency(pl.revenue || 0)} sub={`${stats.salesCount || 0} Invoice • ${stats.totalSalesQty || 0} Unit`} color="blue" isClient={isClient} />
                <KPICard icon={<Receipt className="h-5 w-5 text-rose-500" />} label="HPP (COGS)" value={formatCurrency(pl.hpp || 0)} sub={`Harga Pokok Penjualan`} color="rose" isClient={isClient} />
                <KPICard icon={<TrendingUp className="h-5 w-5 text-emerald-500" />} label="Laba Kotor" value={formatCurrency(pl.grossProfit || 0)} sub={`Margin: ${pl.grossMarginPct || 0}%`} color="emerald" trend={pl.grossProfit >= 0 ? 'up' : 'down'} isClient={isClient} />
                <KPICard icon={<DollarSign className="h-5 w-5 text-purple-500" />} label="Laba Bersih" value={formatCurrency(pl.netProfit || 0)} sub={`Margin: ${pl.netMarginPct || 0}%`} color="purple" trend={pl.netProfit >= 0 ? 'up' : 'down'} isClient={isClient} />
            </div>

            {/* P&L Statement */}
            <div className="erp-card overflow-hidden">
                <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <DollarSign className="h-5 w-5 text-emerald-400" />
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-tight">Laporan Laba Rugi</h3>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{data.period?.label || '-'}</p>
                        </div>
                    </div>
                </div>
                <div className="p-6">
                    <div className="max-w-2xl mx-auto space-y-1">
                        <PLRow label="PENDAPATAN (Revenue)" value={pl.revenue} bold isClient={isClient} />
                        <PLRow label="  Subtotal Penjualan" value={pl.revenueSubtotal} sub isClient={isClient} />
                        <PLRow label="  Diskon Penjualan" value={-pl.discount} sub isClient={isClient} />
                        <PLRow label="  PPN Keluaran" value={pl.salesTax} sub isClient={isClient} />
                        <div className="h-3" />
                        <PLRow label="HARGA POKOK PENJUALAN (HPP)" value={pl.hpp} bold negative isClient={isClient} />
                        <div className="border-t-2 border-slate-900 my-3" />
                        <PLRow label="LABA KOTOR" value={pl.grossProfit} bold highlight={pl.grossProfit >= 0 ? 'green' : 'red'} isClient={isClient} />
                        <PLRow label={`  Margin Kotor`} valueStr={`${pl.grossMarginPct || 0}%`} sub isClient={isClient} />
                        <div className="h-3" />
                        <PLRow label="BIAYA OPERASIONAL" value={pl.expenses} bold negative isClient={isClient} />
                        {(pl.expenseByCategory || []).map((cat: any, i: number) => (
                            <PLRow key={i} label={`  ${cat.name}`} value={cat.value} sub isClient={isClient} />
                        ))}
                        <div className="border-t-2 border-slate-900 my-3" />
                        <PLRow label="LABA BERSIH" value={pl.netProfit} bold highlight={pl.netProfit >= 0 ? 'green' : 'red'} isClient={isClient} />
                        <PLRow label={`  Margin Bersih`} valueStr={`${pl.netMarginPct || 0}%`} sub isClient={isClient} />
                    </div>
                </div>
            </div>

            {/* Monthly Chart */}
            {data.dailyBreakdown?.length > 0 && (
                <div className="erp-card p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Trend Harian</h3>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{data.period?.label}</p>
                        </div>
                    </div>
                    <div className="h-[280px]">
                        {isClient && (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.dailyBreakdown} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="gPurchase" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 800 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 800 }} tickFormatter={(v: number) => `${(v / 1000000).toFixed(0)}jt`} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '8px 12px', fontSize: '11px' }} formatter={(value: any) => [formatCurrency(Number(value || 0)), '']} />
                                    <Area type="monotone" dataKey="sales" name="Penjualan" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#gSales)" dot={false} />
                                    <Area type="monotone" dataKey="purchases" name="Pembelian" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#gPurchase)" dot={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            )}

            {/* Sales by Team + Expense Category */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales by Team */}
                <div className="erp-card p-6 bg-slate-900 text-white">
                    <div className="flex items-center gap-2 mb-5">
                        <Users className="h-4 w-4 text-blue-400" />
                        <h3 className="text-sm font-black uppercase tracking-tight">Revenue per Tim</h3>
                    </div>
                    <div className="space-y-4">
                        {[
                            { name: 'Team BC', value: data.salesByTeam?.BC || 0, color: 'bg-blue-500' },
                            { name: 'Team PF', value: data.salesByTeam?.PF || 0, color: 'bg-purple-500' },
                            { name: 'Lainnya', value: data.salesByTeam?.Other || 0, color: 'bg-slate-500' },
                        ].map(t => {
                            const total = (data.salesByTeam?.BC || 0) + (data.salesByTeam?.PF || 0) + (data.salesByTeam?.Other || 0);
                            const pct = total > 0 ? (t.value / total * 100) : 0;
                            return (
                                <div key={t.name} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-slate-400 uppercase">{t.name}</span>
                                        <span className="text-sm font-black tabular-nums">{isClient ? formatCurrency(t.value) : '...'}</span>
                                    </div>
                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div className={`h-full ${t.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                                    </div>
                                    <p className="text-[9px] font-bold text-slate-600 text-right">{pct.toFixed(1)}%</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Expense Pie */}
                {pl.expenseByCategory?.length > 0 && (
                    <div className="erp-card p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <CreditCard className="h-4 w-4 text-amber-500" />
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Komposisi Biaya Operasional</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="h-[200px]">
                                {isClient && (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={pl.expenseByCategory} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value" stroke="none">
                                                {pl.expenseByCategory.map((_: any, i: number) => (
                                                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                            <div className="flex flex-col justify-center space-y-2">
                                {pl.expenseByCategory.slice(0, 6).map((cat: any, i: number) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className="h-2 w-4 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                        <span className="text-[10px] font-bold text-slate-500 truncate">{cat.name}</span>
                                        <span className="text-[10px] font-black tabular-nums ml-auto">{isClient ? formatCurrency(cat.value) : '...'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* AR/AP Aging */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Piutang (AR) */}
                <div className="erp-card overflow-hidden">
                    <div className="bg-blue-600 text-white px-6 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ArrowUpRight className="h-4 w-4" />
                            <h3 className="text-xs font-black uppercase tracking-widest">Piutang (Accounts Receivable)</h3>
                        </div>
                        <span className="text-lg font-black tabular-nums">{isClient ? formatCurrency(data.arAging?.buckets?.total || 0) : '...'}</span>
                    </div>
                    <div className="p-5">
                        {data.arAging?.buckets && (
                            <div className="grid grid-cols-5 gap-2 mb-4">
                                {[
                                    { key: 'current', label: 'Current' },
                                    { key: 'd30', label: '1-30 Hari' },
                                    { key: 'd60', label: '31-60 Hari' },
                                    { key: 'd90', label: '61-90 Hari' },
                                    { key: 'over90', label: '> 90 Hari' },
                                ].map(b => (
                                    <div key={b.key} className="p-2 bg-slate-50 rounded-lg text-center">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{b.label}</p>
                                        <p className="text-xs font-black tabular-nums text-slate-900">{isClient ? formatCurrency((data.arAging.buckets as any)[b.key] || 0) : '...'}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {data.arAging?.items?.length > 0 && (
                            <div className="max-h-[200px] overflow-y-auto custom-scrollbar space-y-1">
                                {data.arAging.items.slice(0, 10).map((r: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between py-1.5 px-2 border-b border-slate-50 text-[11px] hover:bg-slate-50 rounded">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="font-black text-slate-900 shrink-0">{r.number}</span>
                                            <span className="text-slate-500 truncate">{r.partner}</span>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className="text-[9px] font-bold text-slate-400">{r.days}d</span>
                                            <span className="font-black tabular-nums text-blue-600">{isClient ? formatCurrency(r.outstanding) : '...'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Hutang (AP) */}
                <div className="erp-card overflow-hidden">
                    <div className="bg-amber-600 text-white px-6 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ArrowDownRight className="h-4 w-4" />
                            <h3 className="text-xs font-black uppercase tracking-widest">Hutang (Accounts Payable)</h3>
                        </div>
                        <span className="text-lg font-black tabular-nums">{isClient ? formatCurrency(data.apAging?.buckets?.total || 0) : '...'}</span>
                    </div>
                    <div className="p-5">
                        {data.apAging?.buckets && (
                            <div className="grid grid-cols-5 gap-2 mb-4">
                                {[
                                    { key: 'current', label: 'Current' },
                                    { key: 'd30', label: '1-30 Hari' },
                                    { key: 'd60', label: '31-60 Hari' },
                                    { key: 'd90', label: '61-90 Hari' },
                                    { key: 'over90', label: '> 90 Hari' },
                                ].map(b => (
                                    <div key={b.key} className="p-2 bg-slate-50 rounded-lg text-center">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{b.label}</p>
                                        <p className="text-xs font-black tabular-nums text-slate-900">{isClient ? formatCurrency((data.apAging.buckets as any)[b.key] || 0) : '...'}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {data.apAging?.items?.length > 0 && (
                            <div className="max-h-[200px] overflow-y-auto custom-scrollbar space-y-1">
                                {data.apAging.items.slice(0, 10).map((r: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between py-1.5 px-2 border-b border-slate-50 text-[11px] hover:bg-slate-50 rounded">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="font-black text-slate-900 shrink-0">{r.number}</span>
                                            <span className="text-slate-500 truncate">{r.partner}</span>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className="text-[9px] font-bold text-slate-400">{r.days}d</span>
                                            <span className="font-black tabular-nums text-amber-600">{isClient ? formatCurrency(r.outstanding) : '...'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Top Buyers + Top Suppliers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {data.topBuyers?.length > 0 && (
                    <div className="erp-card p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Building className="h-4 w-4 text-blue-500" />
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Top 10 Buyer</h3>
                        </div>
                        <div className="space-y-3">
                            {data.topBuyers.map((b: any, i: number) => {
                                const maxVal = data.topBuyers[0]?.total || 1;
                                return (
                                    <div key={i} className="space-y-1">
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="font-bold text-slate-700 truncate max-w-[200px]">{b.name}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[9px] font-bold text-slate-400">{b.count} inv</span>
                                                <span className="font-black tabular-nums">{isClient ? formatCurrency(b.total) : '...'}</span>
                                            </div>
                                        </div>
                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(b.total / maxVal) * 100}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                {data.topSuppliers?.length > 0 && (
                    <div className="erp-card p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Truck className="h-4 w-4 text-emerald-500" />
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Top 10 Supplier</h3>
                        </div>
                        <div className="space-y-3">
                            {data.topSuppliers.map((s: any, i: number) => {
                                const maxVal = data.topSuppliers[0]?.total || 1;
                                return (
                                    <div key={i} className="space-y-1">
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="font-bold text-slate-700 truncate max-w-[200px]">{s.name}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[9px] font-bold text-slate-400">{s.count} LPB</span>
                                                <span className="font-black tabular-nums">{isClient ? formatCurrency(s.total) : '...'}</span>
                                            </div>
                                        </div>
                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(s.total / maxVal) * 100}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Returns Summary */}
            {(data.returnPurchaseSummary?.count > 0 || data.returnSalesSummary?.count > 0) && (
                <div className="erp-card p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <RotateCcw className="h-4 w-4 text-rose-500" />
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Ringkasan Retur Bulan Ini</h3>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {data.returnPurchaseSummary?.count > 0 && (
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Retur Pembelian — {data.returnPurchaseSummary.count} retur, {data.returnPurchaseSummary.totalQty} unit</p>
                                {data.returnPurchaseSummary.items.map((r: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 text-[11px]">
                                        <div><span className="font-black">{r.returnNumber}</span> <span className="text-slate-400">• {r.supplier}</span></div>
                                        <div className="flex items-center gap-2">
                                            <span className="tabular-nums">{r.totalQty} unit</span>
                                            <span className={cn("text-[8px] font-black uppercase px-1.5 py-0.5 rounded",
                                                r.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                            )}>{r.status}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {data.returnSalesSummary?.count > 0 && (
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Retur Penjualan — {data.returnSalesSummary.count} retur, {data.returnSalesSummary.totalQty} unit</p>
                                {data.returnSalesSummary.items.map((r: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 text-[11px]">
                                        <div><span className="font-black">{r.returnNumber}</span> <span className="text-slate-400">• {r.buyer}</span></div>
                                        <div className="flex items-center gap-2">
                                            <span className="tabular-nums">{r.totalQty} unit</span>
                                            <span className={cn("text-[8px] font-black uppercase px-1.5 py-0.5 rounded",
                                                r.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                            )}>{r.status}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Traceability Bulanan */}
            {data.details?.monthlyTraceability?.length > 0 && (
                <ReportTable
                    title="Traceability Bulanan" icon={<FileSpreadsheet className="h-4 w-4 text-emerald-500" />}
                    count={data.details.monthlyTraceability.length}
                    totalLabel="Margin Traceability"
                    totalValue={isClient ? (() => {
                        const totalJual = data.details.monthlyTraceability.reduce((sum: number, r: any) => sum + Number(r['TOTAL JUAL'] || 0), 0);
                        const totalMargin = data.details.monthlyTraceability.reduce((sum: number, r: any) => sum + Number(r.MARGIN || 0), 0);
                        const marginPct = totalJual > 0 ? (totalMargin / totalJual * 100) : 0;
                        return `${formatCurrency(totalMargin)} (${marginPct.toFixed(1)}%)`;
                    })() : '...'}
                    exportData={{
                        filename: 'traceability-bulanan',
                        data: data.details.monthlyTraceability
                    }}
                    headers={['No.', 'Barcode', 'Nama Item', 'Supplier', 'No. LPB', 'Tgl Beli', 'Qty Beli', 'Total Beli (HPP)', 'Ops', 'Buyer', 'Sales', 'No. Faktur Penjualan', 'No. Surat Jalan', 'Tgl Jual', 'Qty Jual', 'Total Jual (Net)', 'Margin', 'Margin %', 'Aksi']}
                    rows={data.details.monthlyTraceability.map((row: any) => [
                        <span className="font-bold">{row.NO}</span>,
                        row.BARCODE,
                        <span className="font-black text-slate-900 truncate max-w-[200px] block" title={row['KETERANGAN ITEM']}>{row['KETERANGAN ITEM']}</span>,
                        <span className="truncate max-w-[120px] block" title={row['NAMA SUPPLIER']}>{row['NAMA SUPPLIER']}</span>,
                        <span className="text-[10px] text-slate-500">{row['NOMOR LPB']}</span>,
                        row['TANGGAL BELI'],
                        <span className="tabular-nums font-bold">{row['QTY BELI']}</span>,
                        <span className="tabular-nums font-black text-emerald-600">{isClient ? formatCurrency(row['TOTAL BELI']) : '...'}</span>,
                        <span className="tabular-nums text-slate-500">{isClient ? formatCurrency(row.OPS) : '...'}</span>,
                        <span className="truncate max-w-[120px] block font-bold" title={row['NAMA PEMBELI']}>{row['NAMA PEMBELI']}</span>,
                        <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{row.SALES}</span>,
                        <span className="text-[10px] text-slate-500">{row['NOMOR FAKTUR PENJUALAN']}</span>,
                        <span className="text-[10px] text-slate-500">{row['NOMOR SJ']}</span>,
                        row['TANGGAL JUAL'],
                        <span className="tabular-nums font-bold">{row['QTY JUAL']}</span>,
                        <span className="tabular-nums font-black text-blue-600">{isClient ? formatCurrency(row['TOTAL JUAL']) : '...'}</span>,
                        <span className={cn("tabular-nums font-black", Number(row.MARGIN) >= 0 ? "text-emerald-600" : "text-rose-600")}>
                            {isClient ? formatCurrency(row.MARGIN) : '...'}
                        </span>,
                        <span className={cn("tabular-nums font-black text-[10px]", Number(row.MARGIN) >= 0 ? "text-emerald-600" : "text-rose-600")}>
                            {row['MARGIN %'] || '0%'}
                        </span>
                    ])}
                    isClient={isClient}
                    actions={divisionFilterSelect}
                />
            )}

            {/* Sales Detail Table */}
            {data.details?.sales?.length > 0 && (
                <ReportTable
                    title="Detail Penjualan" icon={<ShoppingBag className="h-4 w-4 text-blue-500" />}
                    count={data.details.sales.length} totalLabel="Total Revenue" totalValue={formatCurrency(pl.revenue || 0)}
                    headers={['No. Penjualan', 'No. Surat Jalan', 'Buyer', 'Alamat', 'Gudang', 'Qty', 'Total Jual', 'Tanggal', 'Status']}
                    rows={data.details.sales.map((row: any) => [
                        <span className="font-black text-blue-700">{row.invoiceNumber || row.number}</span>,
                        <span className="font-mono text-slate-500 text-xs">{row.number}</span>,
                        <span className="truncate max-w-[140px] block font-bold">{row.buyer}</span>,
                        <span className="truncate max-w-[150px] block text-xs text-slate-500">{row.alamat || '-'}</span>,
                        <span className="text-[10px] font-black uppercase text-slate-600 bg-slate-100 px-2 py-1 rounded">{row.gudang || '-'}</span>,
                        <span className="tabular-nums font-black">{row.totalQty}</span>,
                        <span className="tabular-nums font-black text-emerald-600">{isClient ? formatCurrency(row.grandTotal) : '...'}</span>,
                        <span className="text-xs text-slate-500">{fmtDate(row.date)}</span>,
                        <PaymentBadge status={row.paymentStatus} />
                    ])}
                    isClient={isClient}
                    actions={divisionFilterSelect}
                />
            )}

            {/* Purchase Detail Table */}
            {data.details?.purchases?.length > 0 && (
                <ReportTable
                    title="Detail Pembelian" icon={<ShoppingCart className="h-4 w-4 text-emerald-500" />}
                    count={data.details.purchases.length} totalLabel="Total Pembelian" totalValue={formatCurrency(data.purchases?.total || 0)}
                    headers={['No. LPB', 'Tanggal', 'Supplier', 'Sales', 'Grand Total', 'Dibayar', 'Status']}
                    rows={data.details.purchases.map((row: any) => [
                        <span className="font-black text-slate-900">{row.number}</span>,
                        fmtDate(row.date),
                        <span className="truncate max-w-[140px] block">{row.supplier}</span>,
                        row.salesPerson || '-',
                        <span className="tabular-nums font-black">{isClient ? formatCurrency(row.grandTotal) : '...'}</span>,
                        <span className="tabular-nums">{isClient ? formatCurrency(row.paidAmount) : '...'}</span>,
                        <PaymentBadge status={row.paymentStatus} />
                    ])}
                    isClient={isClient}
                    actions={divisionFilterSelect}
                />
            )}

            {/* Operational Detail Table */}
            {data.details?.operational?.length > 0 && (
                <ReportTable
                    title="Detail Operasional" icon={<Wallet className="h-4 w-4 text-amber-500" />}
                    count={data.details.operational.length} totalLabel="Total Biaya Ops" totalValue={formatCurrency(pl.expenses || 0)}
                    headers={['Tanggal', 'Keterangan', 'Bank', 'Kategori', 'Sales', 'Jumlah']}
                    rows={data.details.operational.map((row: any) => [
                        fmtDate(row.date),
                        <span className="truncate max-w-[200px] block font-bold">{row.description}</span>,
                        row.bank || '-',
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-slate-100 rounded">{row.category}</span>,
                        row.salesPerson || '-',
                        <span className={cn("tabular-nums font-black", row.amount >= 0 ? "text-emerald-600" : "text-rose-600")}>
                            {isClient ? formatCurrency(row.amount) : '...'}
                        </span>
                    ])}
                    isClient={isClient}
                />
            )}

            {/* Staff Activity */}
            <StaffActivitySection data={data} isClient={isClient} />
        </div>
    );
}


// ═══════════════════════════════════════════════════════════════════════════
// REUSABLE SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function KPICard({ icon, label, value, sub, color, trend, isClient }: any) {
    return (
        <div className="erp-card p-6 relative group">
            <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full bg-${color}-500/5 blur-2xl group-hover:scale-150 transition-all`} />
            <div className="relative space-y-3">
                <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-xl bg-${color}-50 border border-${color}-100/50`}>{icon}</div>
                    {trend && (
                        <span className={cn("flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full",
                            trend === 'up' ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                        )}>
                            {trend === 'up' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                        </span>
                    )}
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                    <p className="text-2xl font-black text-slate-900 tracking-tighter tabular-nums leading-tight">{isClient ? value : 'Rp ---'}</p>
                    {sub && <p className="text-[10px] font-bold text-slate-400 mt-2">{sub}</p>}
                </div>
            </div>
        </div>
    );
}

function MiniStat({ label, value, icon }: any) {
    return (
        <div className="erp-card p-5 flex items-center gap-4">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">{icon}</div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                <p className="text-xl font-black text-slate-900 tabular-nums">{value}</p>
            </div>
        </div>
    );
}

function PaymentBadge({ status }: { status: string }) {
    return (
        <span className={cn("text-[9px] font-black uppercase px-2 py-1 rounded border", PAYMENT_BADGE[status] || PAYMENT_BADGE.PENDING)}>
            {status}
        </span>
    );
}

function PLRow({ label, value, valueStr, bold, sub, negative, highlight, isClient }: any) {
    return (
        <div className={cn("flex items-center justify-between py-3 px-4 rounded-lg",
            bold && !highlight ? "bg-slate-50" : "",
            highlight === 'green' ? "bg-emerald-50 border border-emerald-100" : "",
            highlight === 'red' ? "bg-rose-50 border border-rose-100" : ""
        )}>
            <span className={cn("text-[13px]",
                bold ? "font-black text-slate-900 uppercase" : "",
                sub ? "font-bold text-slate-500 text-[12px]" : "font-bold text-slate-700"
            )}>{label}</span>
            <span className={cn("text-[13px] tabular-nums",
                bold ? "font-black" : "font-bold",
                highlight === 'green' ? "text-emerald-700" : "",
                highlight === 'red' ? "text-rose-700" : "",
                negative ? "text-rose-600" : "text-slate-900"
            )}>
                {valueStr || (isClient ? (value !== undefined ? formatCurrency(value) : '') : 'Rp ---')}
            </span>
        </div>
    );
}

function ReportTable({ title, icon, count, totalLabel, totalValue, headers, rows, isClient, actions }: any) {
    return (
        <div className="erp-card overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
                <div className="flex items-center gap-2">
                    {icon}
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{title}</h3>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{count}</span>
                    {actions && <div className="ml-4 flex items-center gap-2">{actions}</div>}
                </div>
                {totalLabel && (
                    <div className="text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{totalLabel}</p>
                        <p className="text-base font-black text-slate-900 tabular-nums">{isClient ? totalValue : 'Rp ---'}</p>
                    </div>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="bg-slate-900 text-white">
                            {headers.map((h: string, i: number) => (
                                <th key={i} className="px-5 py-4 text-left font-black uppercase tracking-wider whitespace-nowrap text-[11px]">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row: any[], i: number) => (
                            <tr key={i} className={cn("border-b border-slate-100 hover:bg-blue-50/50 transition-colors", i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30')}>
                                {row.map((cell: any, j: number) => (
                                    <td key={j} className="px-5 py-3.5 text-slate-800 whitespace-nowrap">{cell}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function ErrorCard({ message }: { message: string }) {
    return (
        <div className="erp-card p-8 text-center border-rose-200">
            <AlertCircle className="h-8 w-8 text-rose-400 mx-auto mb-3" />
            <p className="text-sm font-black text-slate-900">Gagal Memuat Laporan</p>
            <p className="text-[11px] text-slate-500 mt-1">{message}</p>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="erp-card p-12 text-center">
            <Package className="h-10 w-10 text-slate-200 mx-auto mb-4" />
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">{message}</p>
        </div>
    );
}

function StaffActivitySection({ data, isClient }: { data: any, isClient: boolean }) {
    const finance = data.staffActivity?.finance || [];
    const warehouse = data.staffActivity?.warehouse || [];

    if (finance.length === 0 && warehouse.length === 0) return null;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Finance Staff Work Summary */}
            <div className="erp-card p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Wallet className="h-4 w-4 text-amber-500" />
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Kinerja Pekerjaan Keuangan (Finance)</h3>
                </div>
                {finance.length === 0 ? (
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider text-center py-6">Tidak ada aktivitas keuangan dalam periode ini</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs table-fixed min-w-[350px]">
                            <thead className="text-[9px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 border-b">
                                <tr>
                                    <th className="px-3 py-2 w-1/3">Staf Finance</th>
                                    <th className="px-3 py-2 text-center w-1/6">Transaksi</th>
                                    <th className="px-3 py-2 text-right w-1/4">Kas Keluar</th>
                                    <th className="px-3 py-2 text-right w-1/4">Kas Masuk</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y text-slate-600">
                                {finance.map((f: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-slate-50/50">
                                        <td className="px-3 py-2.5 font-bold text-slate-900 truncate">{f.name}</td>
                                        <td className="px-3 py-2.5 text-center tabular-nums font-bold">{f.count}</td>
                                        <td className="px-3 py-2.5 text-right tabular-nums text-rose-600 font-black">
                                            {isClient ? formatCurrency(f.paymentAmount) : '...'}
                                        </td>
                                        <td className="px-3 py-2.5 text-right tabular-nums text-emerald-600 font-black">
                                            {isClient ? formatCurrency(f.receiptAmount) : '...'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Warehouse Staff Work Summary */}
            <div className="erp-card p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Package className="h-4 w-4 text-purple-500" />
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Kinerja Pekerjaan Gudang (Warehouse)</h3>
                </div>
                {warehouse.length === 0 ? (
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider text-center py-6">Tidak ada aktivitas penerimaan barang gudang</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs table-fixed min-w-[350px]">
                            <thead className="text-[9px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 border-b">
                                <tr>
                                    <th className="px-3 py-2 w-1/3">Staf Warehouse</th>
                                    <th className="px-3 py-2 text-center w-1/5">LPB Dibuat</th>
                                    <th className="px-3 py-2 text-center w-1/5">LPB Verifikasi</th>
                                    <th className="px-3 py-2 text-right w-1/4">Barang Masuk</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y text-slate-600">
                                {warehouse.map((w: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-slate-50/50">
                                        <td className="px-3 py-2.5 font-bold text-slate-900 truncate">{w.name}</td>
                                        <td className="px-3 py-2.5 text-center tabular-nums">{w.createdCount}</td>
                                        <td className="px-3 py-2.5 text-center tabular-nums font-bold text-emerald-600">{w.verifiedCount}</td>
                                        <td className="px-3 py-2.5 text-right tabular-nums font-black truncate">
                                            {w.totalQtyReceived.toLocaleString("id-ID")} unit
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
