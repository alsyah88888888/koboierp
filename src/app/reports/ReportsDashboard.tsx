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
    FileCode2, Sparkles, Banknote, Search, Download, Eye, ArrowUpCircle, ArrowDownCircle
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
    const [closingReport, setClosingReport] = useState<any>(null);
    const [closingPeriod, setClosingPeriod] = useState({ 
        month: new Date().getMonth() + 1, 
        year: new Date().getFullYear() 
    });
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
            'No. Invoice': s.number,
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
        if (activeTab === "closing" && closingReport) {
            const printWindow = window.open('', '_blank');
            if (!printWindow) return;

            const html = `
                <html>
                    <head>
                        <title>Laporan Closing Bulanan - ${closingReport.period}</title>
                        <style>
                            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
                            .header { border-bottom: 4px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
                            .header h1 { margin: 0; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; font-size: 32px; color: #0f172a; }
                            .summary-grid { display: grid; grid-template-cols: repeat(4, 1fr); gap: 20px; margin-bottom: 40px; }
                            .summary-card { padding: 15px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; }
                            .summary-card p { margin: 0; font-size: 10px; font-weight: 900; text-transform: uppercase; color: #64748b; letter-spacing: 1px; }
                            .summary-card h2 { margin: 5px 0 0; font-size: 18px; font-weight: 900; letter-spacing: -0.5px; }
                            h3 { font-weight: 900; text-transform: uppercase; font-size: 14px; border-left: 4px solid #3b82f6; padding-left: 12px; margin-top: 40px; margin-bottom: 15px; color: #0f172a; }
                            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 11px; }
                            th { background: #f8fafc; padding: 12px; text-align: left; font-weight: 900; text-transform: uppercase; font-size: 9px; border-bottom: 2px solid #e2e8f0; color: #475569; }
                            td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
                            .text-right { text-align: right; }
                            .font-black { font-weight: 900; color: #0f172a; }
                            .footer-sig { margin-top: 80px; display: grid; grid-template-cols: 1fr 1fr; text-align: center; gap: 40px; }
                            .sig-box { border-top: 1px solid #cbd5e1; padding-top: 10px; font-weight: 900; font-size: 12px; margin: 0 auto; width: 220px; }
                            @media print { 
                                body { padding: 0; }
                                .summary-card { border: 1px solid #000; }
                                h3 { border-left: 4px solid #000; }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <div>
                                <p style="font-weight: 900; color: #3b82f6; margin: 0; font-size: 11px; letter-spacing: 2px;">KOBOI ERP - FINANCIAL MODULE</p>
                                <h1>Closing Report</h1>
                                <p style="margin: 5px 0 0; font-weight: 700; color: #64748b; font-size: 14px;">Periode: ${closingReport.period}</p>
                            </div>
                            <div class="text-right">
                                <p style="font-size: 9px; font-weight: 900; color: #94a3b8; text-transform: uppercase;">Generated at: ${format(new Date(), "dd MMM yyyy HH:mm")}</p>
                            </div>
                        </div>

                        <div class="summary-grid">
                            <div class="summary-card">
                                <p>Penjualan</p>
                                <h2>${formatCurrency(closingReport.revenue)}</h2>
                            </div>
                            <div class="summary-card">
                                <p>Pembelian</p>
                                <h2>${formatCurrency(closingReport.inventory?.purchases || 0)}</h2>
                            </div>
                            <div class="summary-card">
                                <p>Operasional</p>
                                <h2>${formatCurrency(closingReport.expenses)}</h2>
                            </div>
                            <div class="summary-card">
                                <p>Gross Margin</p>
                                <h2>${formatCurrency(closingReport.grossProfit)}</h2>
                            </div>
                            <div class="summary-card" style="background: #f8fafc; border: 1px solid #3b82f6;">
                                <p style="color: #3b82f6;">Profit</p>
                                <h2 style="color: ${closingReport.netProfit >= 0 ? '#059669' : '#dc2626'}">${formatCurrency(closingReport.netProfit)}</h2>
                            </div>
                        </div>

                        <h3>I. Detail Penjualan (Matching Kas Masuk BCA)</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 12%;">Tanggal SJ</th>
                                    <th style="width: 20%;">No. Invoice / SJ</th>
                                    <th style="width: 30%;">Nama Customer</th>
                                    <th style="width: 12%;">Bank</th>
                                    <th style="width: 12%;">Tgl Bayar</th>
                                    <th style="width: 14%;" class="text-right">Nilai Transaksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${closingReport.details?.sales?.map((s: any) => `
                                    <tr>
                                        <td>${format(new Date(s.date), "dd/MM/yyyy")}</td>
                                        <td class="font-black">${s.number}</td>
                                        <td>${s.entity || '-'}</td>
                                        <td class="font-black" style="color: #3b82f6;">${s.bankCode}</td>
                                        <td>${s.paymentDate ? format(new Date(s.paymentDate), "dd/MM/yyyy") : '-'}</td>
                                        <td class="text-right font-black">${formatCurrency(s.grandTotal)}</td>
                                    </tr>
                                `).join('') || '<tr><td colspan="6" style="text-align:center">Tidak ada transaksi penjualan dalam periode ini</td></tr>'}
                            </tbody>
                        </table>

                        <h3>II. Detail Biaya Operasional (Matching Kas Keluar BCA)</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 15%;">Tanggal</th>
                                    <th style="width: 20%;">Kategori</th>
                                    <th style="width: 45%;">Deskripsi Biaya</th>
                                    <th style="width: 20%;" class="text-right">Nominal</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${closingReport.details?.expenses?.map((e: any) => `
                                    <tr>
                                        <td>${format(new Date(e.date), "dd/MM/yyyy")}</td>
                                        <td>${e.category || 'OPR'}</td>
                                        <td>${e.description}</td>
                                        <td class="text-right font-black">${formatCurrency(Math.abs(e.amount))}</td>
                                    </tr>
                                `).join('') || '<tr><td colspan="4" style="text-align:center">Tidak ada pengeluaran operasional dalam periode ini</td></tr>'}
                            </tbody>
                        </table>

                        <div style="page-break-before: always;"></div>

                        <h3>III. Detail Pembelian Barang (Inventory Admission)</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 12%;">Tanggal LPB</th>
                                    <th style="width: 20%;">No. LPB / GR</th>
                                    <th style="width: 30%;">Nama Supplier</th>
                                    <th style="width: 12%;">Bank</th>
                                    <th style="width: 12%;">Tgl Bayar</th>
                                    <th style="width: 14%;" class="text-right">Total Tagihan</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${closingReport.details?.purchases?.map((p: any) => `
                                    <tr>
                                        <td>${format(new Date(p.date), "dd/MM/yyyy")}</td>
                                        <td class="font-black">${p.number}</td>
                                        <td>${p.entity || '-'}</td>
                                        <td class="font-black" style="color: #ef4444;">${p.bankCode}</td>
                                        <td>${p.paymentDate ? format(new Date(p.paymentDate), "dd/MM/yyyy") : '-'}</td>
                                        <td class="text-right font-black">${formatCurrency(p.grandTotal)}</td>
                                    </tr>
                                `).join('') || '<tr><td colspan="6" style="text-align:center">Tidak ada transaksi pembelian dalam periode ini</td></tr>'}
                            </tbody>
                        </table>

                        <div class="footer-sig">
                            <div>
                                <p style="font-size: 10px; font-weight: 900; color: #64748b; margin-bottom: 70px; text-transform: uppercase;">Prepared By (Finance)</p>
                                <div class="sig-box">ADMIN FINANCE</div>
                            </div>
                            <div>
                                <p style="font-size: 10px; font-weight: 900; color: #64748b; margin-bottom: 70px; text-transform: uppercase;">Approved By (Management)</p>
                                <div class="sig-box">DIRECTOR / OWNER</div>
                            </div>
                        </div>

                        <script>
                            window.onload = () => { 
                                setTimeout(() => {
                                    window.print(); 
                                }, 500);
                            };
                        </script>
                    </body>
                </html>
            `;

            printWindow.document.write(html);
            printWindow.document.close();
        } else {
            window.print();
        }
    };

    useEffect(() => {
        if (activeTab === 'daily') fetchDaily();
        else if (activeTab === 'weekly') fetchWeekly();
        else if (activeTab === 'monthly') fetchMonthly();
        else if (activeTab === 'closing') {
            fetchClosingReport(closingPeriod.month, closingPeriod.year, closingPrefix);
        }
    }, [activeTab, fetchDaily, fetchWeekly, fetchMonthly, closingPeriod, closingPrefix]);

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
                    'No': i + 1, 'No. SJ': s.number, 'Tanggal': fmtDate(s.date),
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
                'Tanggal': d.dateLabel, 'Hari': d.dayName,
                'Penjualan': d.sales, 'HPP': d.hpp, 'Margin %': `${d.marginPct?.toFixed(1) || 0}%`,
                'Pembelian': d.purchases, 'Biaya Ops': d.opsExpense,
                'Jml SJ': d.salesCount, 'Jml LPB': d.purchaseCount,
                'Qty Jual': d.salesQty, 'Qty Beli': d.purchaseQty
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Breakdown Harian');
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
                    'No': i + 1, 'No. SJ': s.number, 'Tanggal': fmtDate(s.date),
                    'Buyer': s.buyer, 'Sales': s.salesPerson || '-', 'Qty': s.totalQty,
                    'Grand Total': s.grandTotal, 'HPP': s.hpp, 'Margin': s.margin, 'Margin %': `${s.marginPct?.toFixed(1) || 0}%`, 'Status': s.paymentStatus
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

        const prefixSuffix = activePrefix !== 'ALL' ? `_${activePrefix}` : '';
        const tabLabel = activeTab === 'daily' ? `Harian_${selectedDate}` : activeTab === 'weekly' ? `Mingguan_${selectedWeekStart}` : `Bulanan_${monthNames[selectedMonth - 1]}_${selectedYear}`;
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

                        <div className="h-9 border-l border-slate-200/80 mx-1 hidden sm:block" />
                        <select
                            value={activePrefix}
                            onChange={e => setActivePrefix(e.target.value as any)}
                            className="erp-input !w-auto !h-9 !py-1 !text-xs font-black bg-white cursor-pointer"
                        >
                            <option value="ALL">ALL DIV</option>
                            <option value="PF">PF DIV</option>
                            <option value="BC">BC DIV</option>
                        </select>
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
                    {activeTab === 'daily' && dailyData && <DailyReport data={dailyData} isClient={isClient} fmtDate={fmtDate} />}
                    {activeTab === 'weekly' && weeklyData && <WeeklyReport data={weeklyData} isClient={isClient} fmtDate={fmtDate} />}
                    {activeTab === 'monthly' && monthlyData && <MonthlyReport data={monthlyData} isClient={isClient} fmtDate={fmtDate} />}
                    
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
                                            { label: "Penjualan", value: closingReport.revenue, color: "text-emerald-500", icon: ArrowUpCircle },
                                            { label: "Pembelian", value: closingReport.inventory?.purchases || 0, color: "text-blue-500", icon: ShoppingCart },
                                            { label: "Operasional", value: closingReport.expenses, color: "text-amber-500", icon: Wallet },
                                            { label: "Gross Margin", value: closingReport.grossProfit, color: "text-emerald-600", icon: Sparkles },
                                            { label: "Profit", value: closingReport.netProfit, color: "text-indigo-600", icon: Banknote },
                                        ].map((card, i) => (
                                            <div key={i} className="bg-white p-6 rounded-3xl border-2 border-slate-50 shadow-sm hover:shadow-md transition-all group">
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
                                                                <p className="text-2xl font-black text-slate-900 tabular-nums tracking-tighter">{formatCurrency(closingReport.outstandingAR)}</p>
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
                                                                <p className="text-2xl font-black text-slate-900 tabular-nums tracking-tighter">{formatCurrency(closingReport.outstandingAP)}</p>
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
        </div>
    );
}


// ═══════════════════════════════════════════════════════════════════════════
// DAILY REPORT SUB-COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
function DailyReport({ data, isClient, fmtDate }: { data: any; isClient: boolean; fmtDate: (d: any) => string }) {
    if (data.error) return <ErrorCard message={data.error} />;
    const s = data.summary || {};
    const d = data.details || {};

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
                    headers={['No. SJ', 'Buyer', 'Sales', 'Qty', 'Grand Total', 'HPP', 'Margin', 'Dibayar', 'Status', 'Operator']}
                    rows={d.sales.map((row: any) => [
                        <span className="font-black text-slate-900">{row.number}</span>,
                        <span className="truncate max-w-[140px] block">{row.buyer}</span>,
                        row.salesPerson || '-',
                        <span className="tabular-nums font-black">{row.totalQty}</span>,
                        <span className="tabular-nums font-black">{isClient ? formatCurrency(row.grandTotal) : '...'}</span>,
                        <span className="tabular-nums text-rose-600">{isClient ? formatCurrency(row.hpp) : '...'}</span>,
                        <span className={cn("tabular-nums font-black", row.margin >= 0 ? "text-emerald-600" : "text-rose-600")}>
                            {isClient ? `${formatCurrency(row.margin)} (${row.marginPct?.toFixed(1) || 0}%)` : '...'}
                        </span>,
                        <span className="tabular-nums">{isClient ? formatCurrency(row.paidAmount) : '...'}</span>,
                        <PaymentBadge status={row.paymentStatus} />,
                        <span className="text-slate-400">{row.operator}</span>
                    ])}
                    isClient={isClient}
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
                    headers={['No.', 'Barcode', 'Nama Item', 'Supplier', 'No. LPB', 'Tgl Beli', 'Total Beli (HPP)', 'Ops', 'Buyer', 'Sales', 'No. Faktur Penjualan', 'Tgl Jual', 'Total Jual (Net)', 'Margin', 'Margin %']}
                    rows={d.dailyTraceability.map((row: any) => [
                        <span className="font-bold">{row.NO}</span>,
                        row.BARCODE,
                        <span className="truncate max-w-[150px] block font-bold" title={row['KETERANGAN ITEM']}>{row['KETERANGAN ITEM']}</span>,
                        <span className="truncate max-w-[130px] block" title={row['NAMA SUPPLIER']}>{row['NAMA SUPPLIER']}</span>,
                        <span className="font-semibold">{row['NOMOR LPB']}</span>,
                        row['TANGGAL BELI'],
                        <span className="tabular-nums font-bold text-rose-600">{isClient ? formatCurrency(row['TOTAL BELI']) : '...'}</span>,
                        <span className="tabular-nums font-bold text-amber-600">{isClient ? formatCurrency(row.OPS) : '...'}</span>,
                        <span className="truncate max-w-[130px] block" title={row['NAMA PEMBELI']}>{row['NAMA PEMBELI']}</span>,
                        row.SALES || '-',
                        <span className="font-black text-slate-900">{row['NOMOR FAKTUR PENJUALAN']}</span>,
                        row['TANGGAL JUAL'],
                        <span className="tabular-nums font-bold text-blue-600">{isClient ? formatCurrency(row['TOTAL JUAL']) : '...'}</span>,
                        <span className={cn("tabular-nums font-black", row.MARGIN >= 0 ? "text-emerald-600" : "text-rose-600")}>
                            {isClient ? formatCurrency(row.MARGIN) : '...'}
                        </span>,
                        <span className={cn("font-black", row.MARGIN >= 0 ? "text-emerald-600" : "text-rose-600")}>
                            {row['MARGIN %']}
                        </span>
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
function WeeklyReport({ data, isClient, fmtDate }: { data: any; isClient: boolean; fmtDate: (d: any) => string }) {
    if (data.error) return <ErrorCard message={data.error} />;
    const s = data.summary || {};
    const breakdown = data.dailyBreakdown || [];

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
                headers={['Hari', 'Tanggal', 'Penjualan', 'HPP', 'Margin %', 'Pembelian', 'Ops', 'SJ', 'LPB', 'Qty Jual', 'Qty Beli']}
                rows={breakdown.map((row: any) => [
                    <span className="font-black">{row.dayName}</span>,
                    row.dateLabel,
                    <span className="tabular-nums font-black text-blue-600">{isClient ? formatCurrency(row.sales) : '...'}</span>,
                    <span className="tabular-nums text-rose-600">{isClient ? formatCurrency(row.hpp) : '...'}</span>,
                    <span className={cn("tabular-nums font-black", (row.sales - row.hpp) >= 0 ? "text-emerald-600" : "text-rose-600")}>
                        {isClient ? `${row.marginPct?.toFixed(1) || 0}%` : '...'}
                    </span>,
                    <span className="tabular-nums font-black text-emerald-600">{isClient ? formatCurrency(row.purchases) : '...'}</span>,
                    <span className="tabular-nums text-amber-600">{isClient ? formatCurrency(row.opsExpense) : '...'}</span>,
                    <span className="tabular-nums font-black">{row.salesCount}</span>,
                    <span className="tabular-nums font-black">{row.purchaseCount}</span>,
                    <span className="tabular-nums">{row.salesQty}</span>,
                    <span className="tabular-nums">{row.purchaseQty}</span>
                ])}
                isClient={isClient}
            />

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
function MonthlyReport({ data, isClient, fmtDate }: { data: any; isClient: boolean; fmtDate: (d: any) => string }) {
    if (data.error) return <ErrorCard message={data.error} />;
    const pl = data.profitLoss || {};
    const stats = data.stats || {};

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

            {/* Sales Detail Table */}
            {data.details?.sales?.length > 0 && (
                <ReportTable
                    title="Detail Penjualan" icon={<ShoppingBag className="h-4 w-4 text-blue-500" />}
                    count={data.details.sales.length} totalLabel="Total Revenue" totalValue={formatCurrency(pl.revenue || 0)}
                    headers={['No. SJ', 'Tanggal', 'Buyer', 'Sales', 'Qty', 'Grand Total', 'HPP', 'Margin', 'Dibayar', 'Status']}
                    rows={data.details.sales.map((row: any) => [
                        <span className="font-black text-slate-900">{row.number}</span>,
                        fmtDate(row.date),
                        <span className="truncate max-w-[140px] block">{row.buyer}</span>,
                        row.salesPerson || '-',
                        <span className="tabular-nums font-black">{row.totalQty}</span>,
                        <span className="tabular-nums font-black">{isClient ? formatCurrency(row.grandTotal) : '...'}</span>,
                        <span className="tabular-nums text-rose-600">{isClient ? formatCurrency(row.hpp) : '...'}</span>,
                        <span className={cn("tabular-nums font-black", row.margin >= 0 ? "text-emerald-600" : "text-rose-600")}>
                            {isClient ? `${formatCurrency(row.margin)} (${row.marginPct?.toFixed(1) || 0}%)` : '...'}
                        </span>,
                        <span className="tabular-nums">{isClient ? formatCurrency(row.paidAmount) : '...'}</span>,
                        <PaymentBadge status={row.paymentStatus} />
                    ])}
                    isClient={isClient}
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
        <div className="erp-card p-5 relative group">
            <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full bg-${color}-500/5 blur-2xl group-hover:scale-150 transition-all`} />
            <div className="relative space-y-3">
                <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-xl bg-${color}-50 border border-${color}-100/50`}>{icon}</div>
                    {trend && (
                        <span className={cn("flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-full",
                            trend === 'up' ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                        )}>
                            {trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        </span>
                    )}
                </div>
                <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                    <p className="text-xl font-black text-slate-900 tracking-tighter tabular-nums leading-tight">{isClient ? value : 'Rp ---'}</p>
                    {sub && <p className="text-[9px] font-bold text-slate-400 mt-1">{sub}</p>}
                </div>
            </div>
        </div>
    );
}

function MiniStat({ label, value, icon }: any) {
    return (
        <div className="erp-card p-4 flex items-center gap-3">
            {icon}
            <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                <p className="text-lg font-black text-slate-900 tabular-nums">{value}</p>
            </div>
        </div>
    );
}

function PaymentBadge({ status }: { status: string }) {
    return (
        <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded border", PAYMENT_BADGE[status] || PAYMENT_BADGE.PENDING)}>
            {status}
        </span>
    );
}

function PLRow({ label, value, valueStr, bold, sub, negative, highlight, isClient }: any) {
    return (
        <div className={cn("flex items-center justify-between py-2 px-3 rounded-lg",
            bold && !highlight ? "bg-slate-50" : "",
            highlight === 'green' ? "bg-emerald-50 border border-emerald-100" : "",
            highlight === 'red' ? "bg-rose-50 border border-rose-100" : ""
        )}>
            <span className={cn("text-[12px]",
                bold ? "font-black text-slate-900 uppercase" : "",
                sub ? "font-bold text-slate-500 text-[11px]" : "font-bold text-slate-700"
            )}>{label}</span>
            <span className={cn("text-[12px] tabular-nums",
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

function ReportTable({ title, icon, count, totalLabel, totalValue, headers, rows, isClient }: any) {
    return (
        <div className="erp-card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
                <div className="flex items-center gap-2">
                    {icon}
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{title}</h3>
                    <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{count}</span>
                </div>
                {totalLabel && (
                    <div className="text-right">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{totalLabel}</p>
                        <p className="text-sm font-black text-slate-900 tabular-nums">{isClient ? totalValue : 'Rp ---'}</p>
                    </div>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                    <thead>
                        <tr className="bg-slate-900 text-white">
                            {headers.map((h: string, i: number) => (
                                <th key={i} className="px-4 py-3 text-left font-black uppercase tracking-wider whitespace-nowrap text-[10px]">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row: any[], i: number) => (
                            <tr key={i} className={cn("border-b border-slate-50 hover:bg-blue-50/30 transition-colors", i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30')}>
                                {row.map((cell: any, j: number) => (
                                    <td key={j} className="px-4 py-2.5 text-slate-700 whitespace-nowrap">{cell}</td>
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
