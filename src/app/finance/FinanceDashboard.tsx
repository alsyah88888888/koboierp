"use client";
import * as XLSX from 'xlsx';

import { useState, useEffect, useRef } from "react";
import { Plus, Search, Wallet, ArrowUpCircle, ArrowDownCircle, FileText, Trash2, Download, Eye, FileCode2, X, Banknote, Calendar, Printer, Sparkles, ShoppingCart } from "lucide-react";
import { ReportPreviewModal } from "@/components/ReportPreviewModal";
import { formatCurrency, cn } from "@/lib/utils";
import { format } from "date-fns";
import { FinanceModal } from "./FinanceModal";
import { useSession } from "next-auth/react";
import { callAction } from "@/proxy";
import { DashboardStats } from "../components/DashboardStats";

import { CheckCircle2, Clock } from "lucide-react";
import { exportToExcel } from "@/lib/excel";
import { useRouter } from "next/navigation";

export function FinanceDashboard({ accounts, ledger, vendors, customers, pendingPurchases, pendingSales, unverifiedReceipts, pendingReturns, pendingSalesReturns, pendingPurchaseRequests, transactions, settledPurchases, settledSales, totalPaidAP, totalPaidAR, monthlyStats }: {
    accounts: any[],
    ledger: any[],
    vendors: any[],
    customers: any[],
    pendingPurchases: any[],
    pendingSales: any[],
    unverifiedReceipts: any[],
    pendingReturns: any[],
    pendingSalesReturns: any[],
    pendingPurchaseRequests: any[],
    transactions: any[],
    settledPurchases: any[],
    settledSales: any[],
    totalPaidAP: number,
    totalPaidAR: number,
    monthlyStats: { label: string, ap: number, ar: number }[]
}) {
    const { data: session } = useSession() as any;
    const userRole = session?.user?.role?.toUpperCase() || "";
    const isAdmin = userRole === "ADMIN";
    const isAdminOrFinance = isAdmin || userRole === "FINANCE";
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);
    const [historyMonth, setHistoryMonth] = useState<string>("ALL");
    const [activeTab, setActiveTab] = useState<"ledger" | "ap" | "ar" | "checker" | "purchase_requests" | "history" | "closing">("ledger");
    const [loading, setLoading] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);

    // Closing Report State
    const [closingReport, setClosingReport] = useState<any>(null);
    const [closingPeriod, setClosingPeriod] = useState({ 
        month: new Date().getMonth() + 1, 
        year: new Date().getFullYear() 
    });
    const [isFetchingClosing, setIsFetchingClosing] = useState(false);

    const [closingPrefix, setClosingPrefix] = useState<'PF' | 'BC' | 'ALL'>('ALL');

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

    useEffect(() => {
        if (activeTab === "closing") {
            fetchClosingReport(closingPeriod.month, closingPeriod.year);
        }
    }, [activeTab, closingPeriod]);

    // Payment Modal State
    const [paymentModal, setPaymentModal] = useState<{
        open: boolean;
        type: "PURCHASE" | "SALE";
        id: string;
        total: number;
        alreadyPaid: number;
        supplierName: string;
    } | null>(null);
    const [paymentAmount, setPaymentAmount] = useState("");
    const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const paymentInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const router = useRouter();

    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [previewTitle, setPreviewTitle] = useState("");

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
                                    <th style="width: 15%;">Tanggal</th>
                                    <th style="width: 25%;">No. Invoice / SJ</th>
                                    <th style="width: 40%;">Nama Customer / Keterangan</th>
                                    <th style="width: 20%;" class="text-right">Nilai Transaksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${closingReport.details?.sales?.map((s: any) => `
                                    <tr>
                                        <td>${format(new Date(s.date), "dd/MM/yyyy")}</td>
                                        <td class="font-black">${s.number}</td>
                                        <td>${s.entity || '-'}</td>
                                        <td class="text-right font-black">${formatCurrency(s.amount)}</td>
                                    </tr>
                                `).join('') || '<tr><td colspan="4" style="text-align:center">Tidak ada transaksi penjualan dalam periode ini</td></tr>'}
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
                                    <th style="width: 15%;">Tanggal</th>
                                    <th style="width: 25%;">No. LPB / GR</th>
                                    <th style="width: 40%;">Nama Supplier</th>
                                    <th style="width: 20%;" class="text-right">Total Tagihan</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${closingReport.details?.purchases?.map((p: any) => `
                                    <tr>
                                        <td>${format(new Date(p.date), "dd/MM/yyyy")}</td>
                                        <td class="font-black">${p.number}</td>
                                        <td>${p.entity || '-'}</td>
                                        <td class="text-right font-black">${formatCurrency(p.amount)}</td>
                                    </tr>
                                `).join('') || '<tr><td colspan="4" style="text-align:center">Tidak ada transaksi pembelian dalam periode ini</td></tr>'}
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

    const handleVerifyPayment = async (type: "PURCHASE" | "SALE", id: string, status: "PAID" | "CREDIT" | "PENDING" | "PARTIAL", partialAmount?: number, pDate?: Date) => {
        const msg = status === "PAID"
            ? `Konfirmasi pelunasan transaksi ini? ${pDate ? "Tanggal: " + format(pDate, "dd/MM/yyyy") : "Saldo Kas/Bank BCA akan otomatis terupdate."}`
            : status === "PARTIAL"
                ? `Konfirmasi pembayaran DP / Sebagian sebesar ${formatCurrency(partialAmount || 0)}? ${pDate ? "Tanggal: " + format(pDate, "dd/MM/yyyy") : ""}`
                : `Konfirmasi pencatatan sebagai ${type === "PURCHASE" ? "Hutang" : "Piutang"}?`;

        if (!confirm(msg)) return;
        setLoading(id);
        try {
            await callAction("updatePaymentStatus", type, id, status, partialAmount, pDate);
            alert("Verifikasi berhasil.");
            router.refresh();
        } catch (e) {
            alert("Gagal memverifikasi.");
        } finally {
            setLoading(null);
        }

    };

    const handlePartialPayment = (type: "PURCHASE" | "SALE", id: string, total: number, alreadyPaid: number, supplierName?: string) => {
        setPaymentAmount("");
        setPaymentDate(format(new Date(), "yyyy-MM-dd"));
        setPaymentModal({ open: true, type, id, total, alreadyPaid, supplierName: supplierName || "" });
        setTimeout(() => paymentInputRef.current?.focus(), 200);
    };

    const handlePaymentModalSubmit = () => {
        if (!paymentModal) return;
        const remaining = paymentModal.total - paymentModal.alreadyPaid;
        const amount = Number(paymentAmount);
        if (isNaN(amount) || amount <= 0 || amount > remaining) {
            alert("Jumlah tidak valid atau melebihi sisa pembayaran.");
            return;
        }
        const pDate = paymentDate ? new Date(paymentDate) : new Date();
        setPaymentModal(null);
        handleVerifyPayment(paymentModal.type, paymentModal.id, amount === remaining ? "PAID" : "PARTIAL", amount, pDate);
    };

    const handleDelete = async (id: string, isManual: boolean) => {
        const msg = isManual ? "Hapus entry jurnal manual ini?" : "Hapus transaksi ini? Seluruh jurnal terkait akan dihapus.";
        if (!confirm(msg)) return;
        try {
            if (isManual) await callAction("deleteJournalEntry", id);
            else await callAction("deleteFinanceTransaction", id);
            alert("Berhasil dihapus");
            router.refresh();
        } catch (e) {
            alert("Gagal menghapus.");
        }

    };

    const filteredLedger = ledger.filter(tx =>
        (tx.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tx.account?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredPurchases = pendingPurchases.filter(p =>
        (p.receiptNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.receivedFrom || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredSales = pendingSales.filter(s =>
        (s.deliveryNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.buyerName || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredReturns = pendingReturns.filter(r =>
        r.returnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.receipt?.receivedFrom.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredSalesReturns = pendingSalesReturns.filter(r =>
        r.returnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.delivery?.buyerName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredSettledPurchases = (settledPurchases || []).filter(p => {
        const matchesSearch = (p.receiptNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.receivedFrom || "").toLowerCase().includes(searchTerm.toLowerCase());
        
        if (historyMonth === "ALL") return matchesSearch;
        const pDate = p.updatedAt ? new Date(p.updatedAt) : null;
        return matchesSearch && pDate && (pDate.getMonth() + 1).toString() === historyMonth;
    });

    const filteredSettledSales = (settledSales || []).filter(s => {
        const matchesSearch = (s.deliveryNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.buyerName || "").toLowerCase().includes(searchTerm.toLowerCase());
        
        if (historyMonth === "ALL") return matchesSearch;
        const sDate = s.updatedAt ? new Date(s.updatedAt) : null;
        return matchesSearch && sDate && (sDate.getMonth() + 1).toString() === historyMonth;
    });

    const handleExport = () => {
        if (activeTab === "ledger") {
            const data = filteredLedger.map(tx => ({
                'Bulan': format(new Date(tx.date), "MMMM yyyy"),
                'Tanggal': format(new Date(tx.date), "dd/MM/yyyy"),
                'Kas/Bank': tx.transaction?.bank || 'Kas/Bank',
                'Deskripsi': tx.description,
                'Referensi/No. Bukti': tx.transaction?.referenceNumber || '-',
                'Akun GL': tx.account?.name,
                'Tipe': tx.type,
                'Nominal': Number(tx.amount),
                'Operator': tx.transaction?.createdBy?.name || tx.createdBy?.name || 'System'
            }));
            exportToExcel(data, `Laporan_Buku_Besar_${format(new Date(), "yyyyMMdd")}`, 'Ledger');
        } else if (activeTab === "ap") {
            const data = filteredPurchases.map(p => ({
                'Bulan': format(new Date(p.date || p.createdAt), "MMMM yyyy"),
                'Tanggal Terima': format(new Date(p.date || p.createdAt), "dd/MM/yyyy"),
                'No. Terima (LPB)': p.receiptNumber,
                'No. Invoice Vendor': p.formNumber || '-',
                'Supplier': p.receivedFrom,
                'No. Faktur Pajak': p.taxInvoiceNumber || '-',
                'Total Tagihan': Number(p.grandTotal),
                'Sudah Dibayar': Number(p.paidAmount || 0),
                'Sisa Hutang': Number(p.grandTotal) - Number(p.paidAmount || 0),
                'Status': p.paymentStatus === 'PAID' ? 'DONE' : p.paymentStatus,
                'Sales Person Vendor': p.salesPerson || '-',
                'Gudang': p.warehouse?.name || '-'
            }));
            exportToExcel(data, `Laporan_Hutang_Dagang_Kompleks_${format(new Date(), "yyyyMMdd")}`, 'AP');
        } else if (activeTab === "ar") {
            const data = filteredSales.map(s => {
                const total = Number(s.grandTotal || 0);
                const paid = Number(s.paidAmount || 0);
                const remaining = total - paid;
                const agingDays = Math.floor((new Date().getTime() - new Date(s.date || s.createdAt).getTime()) / (1000 * 3600 * 24));
                
                return {
                    'Bulan': format(new Date(s.date || s.createdAt), "MMMM yyyy"),
                    'Tanggal SO': s.order?.date ? format(new Date(s.order.date), "dd/MM/yyyy") : '-',
                    'Tanggal SJ': format(new Date(s.date || s.createdAt), "dd/MM/yyyy"),
                    'No. SJ': s.deliveryNumber,
                    'PO BUYER': s.poNumber || '-',
                    'Pelanggan': s.buyerName,
                    'Sales Person': s.salesPerson || '-',
                    'Total Tagihan': total,
                    'Sudah Dibayar': paid,
                    'Sisa Piutang': remaining,
                    'Status': s.paymentStatus === 'PAID' ? 'DONE' : s.paymentStatus,
                    'Umur Piutang (Hari)': agingDays > 0 ? agingDays : 0,
                    'Gudang Asal': s.warehouse?.name || '-'
                };
            });
            exportToExcel(data, `Laporan_Piutang_Dagang_Kompleks_${format(new Date(), "yyyyMMdd")}`, 'AR');
        } else if (activeTab === "checker") {
            const data = unverifiedReceipts.map(r => ({
                'Bulan': format(new Date(r.createdAt), "MMMM yyyy"),
                'Tanggal': format(new Date(r.createdAt), "dd/MM/yyyy"),
                'No. Terima': r.receiptNumber,
                'Supplier': r.receivedFrom,
                'Gudang': r.warehouse?.name,
                'Item Count': r.items.length
            }));
            exportToExcel(data, 'Laporan_Penerimaan_Pending_Gudang', 'Pending');
        } else if (activeTab === "history") {
            const wb = XLSX.utils.book_new();
            
            // Invoices settled (History)
            const settlementData = [
                ...filteredSettledSales.map(s => ({
                    'Tanggal Lunas': format(new Date(s.updatedAt), "dd/MM/yyyy"),
                    'Tipe': 'AR (PELUNASAN PIUTANG)',
                    'Entity': s.buyerName,
                    'Ref Number': s.deliveryNumber,
                    'Nominal': Number(s.total),
                    'Status': 'PAID'
                })),
                ...filteredSettledPurchases.map(p => ({
                    'Tanggal Lunas': format(new Date(p.updatedAt), "dd/MM/yyyy"),
                    'Tipe': 'AP (PEMBAYARAN HUTANG)',
                    'Entity': p.receivedFrom,
                    'Ref Number': p.receiptNumber,
                    'Nominal': Number(p.total),
                    'Status': 'PAID'
                }))
            ];
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(settlementData), 'Settlements');

            // Operational transactions
            const operationalData = (transactions || []).map(tx => ({
                'Tanggal': format(new Date(tx.date), "dd/MM/yyyy"),
                'Deskripsi': tx.description,
                'Ref': tx.referenceNumber || '-',
                'Tipe': tx.transactionType,
                'Nominal': Number(tx.amount),
                'User': tx.createdBy?.name || '-'
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(operationalData), 'Operational');

            XLSX.writeFile(wb, `Laporan_Riwayat_Keuangan_${format(new Date(), "yyyyMMdd")}.xlsx`);
        }
    };

    const handleExportCortex = async () => {
        if (activeTab !== "ar") return;
        try {
            const xml = await callAction("getCortexXmlContent");
            const blob = new Blob([xml], { type: "application/xml" });

            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Cortex_Sales_Export_${format(new Date(), "yyyyMMdd_HHmm")}.xml`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to generate Cortex XML:", error);
            alert("Gagal melakukan export XML Cortex.");
        }
    };

    const handleVerifyReturn = async (id: string, vendorName: string) => {
        if (!confirm(`Verifikasi retur ini? Saldo Hutang (AP) ke ${vendorName} akan otomatis dikurangi!`)) return;
        setLoading(id);
        try {
            await callAction("verifyPurchaseReturn", id);
            alert("Retur berhasil diverifikasi, hutang vendor berkurang.");
            router.refresh();
        } catch (e: any) {
            alert(e.message || "Gagal memverifikasi retur.");
        } finally {

            setLoading(null);
        }
    };

    const handleVerifySalesReturn = async (id: string, buyerName: string) => {
        if (!confirm(`Verifikasi retur penjualan ini? Saldo Piutang (AR) dari ${buyerName} akan otomatis dikurangi!`)) return;
        setLoading(id);
        try {
            await callAction("verifySalesReturn", id);
            alert("Retur berhasil diverifikasi, piutang buyer berkurang.");
            router.refresh();
        } catch (e: any) {
            alert(e.message || "Gagal memverifikasi retur penjualan.");
        } finally {

            setLoading(null);
        }
    };

    const handleVerifyPurchaseRequest = async (id: string, reqNumber: string) => {
        if (!confirm(`Verifikasi pengajuan ${reqNumber}? Saldo Kas/Bank BCA dan Biaya Operasional akan dicatat otomatis.`)) return;
        setLoading(id);
        try {
            await callAction("updatePurchaseRequestStatus", id, "VERIFIED_BY_FINANCE");
            alert("Pengajuan berhasil diverifikasi.");
            router.refresh();
        } catch (e: any) {
            alert(e.message || "Gagal memverifikasi pengajuan.");
        } finally {

            setLoading(null);
        }
    };

    const filteredPurchaseRequests = pendingPurchaseRequests.filter(r =>
        r.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.requestedBy?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handlePreview = () => {
        if (activeTab === "ledger") {
            const data = filteredLedger.map(tx => ({
                'Tanggal': format(new Date(tx.date), "dd/MM/yyyy"),
                'Deskripsi': tx.description,
                'Ref': tx.transaction?.referenceNumber || '-',
                'Akun': tx.account?.name,
                'Tipe': tx.type,
                'Nominal': Number(tx.amount)
            }));
            setPreviewData(data);
            setPreviewTitle("Laporan Jurnal Keuangan (Ledger)");
        } else if (activeTab === "ap") {
            const data = filteredPurchases.map(p => ({
                'Tanggal': format(new Date(p.createdAt), "dd/MM/yyyy"),
                'No. Terima': p.receiptNumber,
                'Supplier': p.receivedFrom,
                'Total': Number(p.total),
                'Status': p.paymentStatus === 'PAID' ? 'DONE' : p.paymentStatus,
                'Gudang': p.isVerified ? 'VERIFIED' : 'PENDING'
            }));
            setPreviewData(data);
            setPreviewTitle("Buku Pembantu Hutang (AP)");
        } else if (activeTab === "ar") {
            const data = filteredSales.map(s => ({
                'Tanggal': format(new Date(s.createdAt), "dd/MM/yyyy"),
                'No. SJ': s.deliveryNumber,
                'Pelanggan': s.buyerName,
                'Total': Number(s.total),
                'Status': s.paymentStatus === 'PAID' ? 'DONE' : s.paymentStatus
            }));
            setPreviewData(data);
            setPreviewTitle("Buku Pembantu Piutang (AR)");
        } else if (activeTab === "checker") {
            const data = unverifiedReceipts.map(r => ({
                'Tanggal': format(new Date(r.createdAt), "dd/MM/yyyy"),
                'No. Terima': r.receiptNumber,
                'Supplier': r.receivedFrom,
                'Gudang': r.warehouse?.name,
                'Item Count': r.items.length
            }));
            setPreviewData(data);
            setPreviewTitle("Daftar Penerimaan Menunggu Checker");
        }
        setShowPreview(true);
    };

    const apAccount = accounts.find((a: any) => a.code === '201');
    const arAccount = accounts.find((a: any) => a.code === '105');

    // We display absolute numeric value from the ledger (GL balances). Liability is technically credit-normal so it is positive in our UI since we handle subtraction under the hood or we Math.abs it, same for AR.
    const totalHutang = Math.abs(apAccount ? apAccount.balance : 0);
    const totalPiutang = Math.abs(arAccount ? arAccount.balance : 0);

    return (
        <div className="space-y-8 pb-16 animate-fade-up">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-1">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Capital & Treasury</h1>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Financial oversight and ledger control</p>
                </div>
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <button
                        onClick={handlePreview}
                        className="erp-btn-secondary !bg-white/80 backdrop-blur-md flex-1 md:flex-none"
                    >
                        <Eye className="h-4 w-4" />
                        <span>Preview</span>
                    </button>
                    <button
                        onClick={handleExport}
                        className="erp-btn-primary !bg-emerald-600 hover:!bg-emerald-700 shadow-emerald-200 flex-1 md:flex-none"
                    >
                        <Download className="h-4 w-4" />
                        <span>Export</span>
                    </button>
                    {activeTab === "ar" && (
                        <button
                            onClick={handleExportCortex}
                            className="erp-btn-primary !bg-orange-600 hover:!bg-orange-700 shadow-orange-200 flex-1 md:flex-none"
                        >
                            <FileCode2 className="h-4 w-4" />
                            <span>Cortex CSV</span>
                        </button>
                    )}
                    <button
                        onClick={() => setShowModal(true)}
                        className="erp-btn-primary flex-1 md:flex-none"
                    >
                        <Plus className="h-4 w-4" />
                        <span>New Entry</span>
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="erp-card p-6 border-l-4 border-l-rose-500 bg-white/50">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Liabilities (AP)</p>
                    <h3 className="text-2xl font-black text-rose-600 tracking-tighter">{formatCurrency(totalHutang)}</h3>
                    <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unpaid Invoices</span>
                            <span className="text-[10px] font-black text-rose-500">{pendingPurchases.filter((p: any) => p.paymentStatus !== 'PAID').length} Docs</span>
                        </div>
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Paid (Cum.)</span>
                            <span className="text-[11px] font-black text-slate-600">{formatCurrency(totalPaidAP)}</span>
                        </div>
                    </div>
                </div>
                <div className="erp-card p-6 border-l-4 border-l-emerald-500 bg-white/50">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Receivables (AR)</p>
                    <h3 className="text-2xl font-black text-emerald-600 tracking-tighter">{formatCurrency(totalPiutang)}</h3>
                    <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Credits</span>
                            <span className="text-[10px] font-black text-emerald-500">{pendingSales.filter((s: any) => s.paymentStatus !== 'PAID').length} Docs</span>
                        </div>
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Collected</span>
                            <span className="text-[11px] font-black text-slate-600">{formatCurrency(totalPaidAR)}</span>
                        </div>
                    </div>
                </div>
                <div className="erp-card p-6 border-l-4 border-l-blue-500 bg-white/50">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Logistics Pendings</p>
                    <h3 className="text-2xl font-black text-blue-600 tracking-tighter">{unverifiedReceipts.length} <span className="text-xs text-slate-400 font-bold ml-1">Receipts</span></h3>
                    <div className="mt-3 flex items-center gap-2 underline underline-offset-4 decoration-blue-100 cursor-pointer" onClick={() => setActiveTab("checker")}>
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Verify Goods Receipt</span>
                    </div>
                </div>
                <div className="erp-card p-6 border-l-4 border-l-amber-500 bg-white/50">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pengajuan (Draft)</p>
                    <h3 className="text-2xl font-black text-amber-600 tracking-tighter">{pendingPurchaseRequests.length} <span className="text-xs text-slate-400 font-bold ml-1">Dokumen</span></h3>
                    <div className="mt-3 flex items-center gap-2 underline underline-offset-4 decoration-amber-100 cursor-pointer" onClick={() => setActiveTab("purchase_requests")}>
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Open Approvals</span>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="space-y-6">
                {/* Monthly Performance Breakdown */}
            <div className="erp-card p-8 bg-slate-900 text-white relative overflow-hidden group border-none shadow-2xl shadow-slate-200">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.1),transparent_70%)]" />
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Monthly Settlement Performance</h2>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-widest">Historical collection & payment trends (Last 6 Months)</p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-blue-400" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {(monthlyStats || []).map((m, idx) => (
                            <div key={idx} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 hover:bg-slate-800/60 transition-all group/month">
                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4 border-b border-slate-700/50 pb-2 group-hover/month:text-white transition-colors">{m.label}</p>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Settled AR</p>
                                        <p className="text-xs font-black text-emerald-400 tabular-nums">{formatCurrency(m.ar)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Settled AP</p>
                                        <p className="text-xs font-black text-rose-400 tabular-nums">{formatCurrency(m.ap)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Tabs */}
                <div className="flex overflow-x-auto whitespace-nowrap gap-2 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50 hide-print custom-scrollbar scrollbar-hide">
                    {[
                        { id: "ledger", label: "Ledger", icon: FileText, count: 0 },
                        { id: "ap", label: "AP (Hutang)", icon: ArrowDownCircle, count: pendingPurchases.filter((p: any) => p.paymentStatus !== 'PAID').length },
                        { id: "ar", label: "AR (Piutang)", icon: ArrowUpCircle, count: pendingSales.filter((s: any) => s.paymentStatus !== 'PAID').length },
                        { id: "checker", label: "Checker", icon: CheckCircle2, count: unverifiedReceipts.length },
                        { id: "purchase_requests", label: "Pengajuan", icon: Wallet, count: pendingPurchaseRequests.length },
                        { id: "history", label: "History", icon: Clock, count: (settledPurchases?.length || 0) + (settledSales?.length || 0) },
                        { id: "closing", label: "Closing Bulanan", icon: FileCode2, count: 0 },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                                "flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300",
                                activeTab === tab.id 
                                    ? "bg-white text-primary shadow-sm border border-slate-200/50 scale-100" 
                                    : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
                            )}
                        >
                            <tab.icon className={cn("h-4 w-4", activeTab === tab.id ? "text-primary" : "text-slate-400")} />
                            {tab.label}
                            {tab.count > 0 && (
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded-md text-[9px]",
                                    activeTab === tab.id ? "bg-primary/10 text-primary" : "bg-slate-200 text-slate-500"
                                )}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Search & Results Panel */}
                <div className="erp-card overflow-hidden border-slate-200/40">
                    <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/50">
                        <div>
                            <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">
                                {activeTab === "ledger" ? "General Ledger Feed" :
                                 activeTab === "ap" ? "Accounts Payable Control" :
                                 activeTab === "ar" ? "Accounts Receivable Control" :
                                 activeTab === "checker" ? "Logistics Verification Gate" :
                                 activeTab === "purchase_requests" ? "PR Approval Queue" :
                                 "Master Transaction History"}
                            </h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Filtering {
                                activeTab === "ledger" ? filteredLedger.length :
                                activeTab === "ap" ? filteredPurchases.length :
                                activeTab === "ar" ? filteredSales.length :
                                activeTab === "checker" ? unverifiedReceipts.length :
                                activeTab === "purchase_requests" ? filteredPurchaseRequests.length :
                                0
                            } records</p>
                        </div>
                        <div className="relative w-full md:w-96 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                            <input
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search by description, ref, or entity..."
                                className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-600 uppercase tracking-widest outline-none focus:border-primary/50 focus:bg-white transition-all shadow-inner"
                            />
                        </div>
                    </div>

                {activeTab === "ledger" && (
                    <div className="overflow-x-auto custom-scrollbar">
                        {/* Desktop Table View */}
                        <table className="w-full text-sm text-left min-w-[1000px] table-fixed hidden md:table">
                            <thead className="bg-slate-50/50 text-slate-400 border-b border-slate-100 text-[10px] uppercase tracking-[0.2em] font-black">
                                <tr>
                                    <th className="px-8 py-5 w-32 tracking-[0.3em]">Date</th>
                                    <th className="px-8 py-5">Description / Ledger Ref</th>
                                    <th className="px-8 py-5 w-60">Account</th>
                                    <th className="px-8 py-5 w-28 text-center">Flow</th>
                                    <th className="px-8 py-5 text-right w-44">Magnitude</th>
                                    {isAdminOrFinance && <th className="px-8 py-5 text-center w-24">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-slate-700">
                                {filteredLedger.map((tx: any) => (
                                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-all group/row">
                                        <td className="px-8 py-5 text-slate-400 font-bold tabular-nums">
                                            {isClient && tx.date ? format(new Date(tx.date), "dd/MM/yy") : "..."}
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="font-black text-slate-900 tracking-tight leading-none mb-1.5 truncate max-w-[400px]" title={tx.description}>{tx.description}</div>
                                            {tx.transaction && (
                                                <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-2">
                                                    <div className="h-1 w-1 bg-slate-300 rounded-full" />
                                                    {tx.transaction.bank} <span className="text-slate-300">/</span> {tx.transaction.referenceNumber || 'CASH'}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100/50 rounded-lg border border-slate-200/40">
                                                <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                                                    {tx.account?.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                                tx.type === "DEBIT" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"
                                            )}>
                                                {tx.type}
                                            </span>
                                        </td>
                                        <td className={cn(
                                            "px-8 py-5 text-right font-black tabular-nums tracking-tighter text-base",
                                            tx.type === "DEBIT" ? "text-emerald-500" : "text-slate-900"
                                        )}>
                                            {formatCurrency(Number(tx.amount))}
                                        </td>
                                        {isAdminOrFinance && (
                                            <td className="px-8 py-5 text-center">
                                                <button
                                                    onClick={() => handleDelete(tx.transactionId || tx.id, !tx.transactionId)}
                                                    className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                    title={tx.transactionId ? "De-authorize Transaction" : "Prune Ledger Entry"}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Mobile Card View */}
                        <div className="md:hidden p-4 space-y-4">
                            {filteredLedger.map((tx: any) => (
                                <div key={tx.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm active:scale-[0.98] transition-transform">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                                {isClient && tx.date ? format(new Date(tx.date), "dd MMM yyyy") : "..."}
                                            </span>
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border w-fit",
                                                tx.type === "DEBIT" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"
                                            )}>
                                                {tx.type}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <div className={cn(
                                                "text-lg font-black tracking-tighter tabular-nums",
                                                tx.type === "DEBIT" ? "text-emerald-500" : "text-slate-900"
                                            )}>
                                                {formatCurrency(Number(tx.amount))}
                                            </div>
                                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{tx.account?.name}</span>
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <div className="font-bold text-slate-900 text-sm leading-tight mb-2">{tx.description}</div>
                                        {tx.transaction && (
                                            <div className="text-[10px] text-slate-400 font-bold bg-slate-50 p-2 rounded-lg border border-slate-100/50">
                                                Ref: {tx.transaction.bank} / {tx.transaction.referenceNumber || 'CASH'}
                                            </div>
                                        )}
                                    </div>
                                    {isAdminOrFinance && (
                                        <button
                                            onClick={() => handleDelete(tx.transactionId || tx.id, !tx.transactionId)}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 text-rose-600 bg-rose-50 rounded-xl text-[10px] font-black uppercase tracking-widest active:bg-rose-100"
                                        >
                                            <Trash2 className="h-3 w-3" /> Remove Record
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === "ap" && (
                    <>
                        <div className="overflow-x-auto custom-scrollbar">
                            {/* Desktop Table */}
                            <table className="w-full text-sm text-left min-w-[900px] table-fixed hidden md:table">
                                <thead className="bg-slate-50/50 text-slate-400 border-b border-slate-100 text-[10px] uppercase tracking-[0.2em] font-black">
                                    <tr>
                                        <th className="px-8 py-5 w-44">Timeline / Ref</th>
                                        <th className="px-8 py-5">Creditor Entity</th>
                                        <th className="px-8 py-5 w-40">Payment State</th>
                                        <th className="px-8 py-5 text-right w-44">Gross Value</th>
                                        <th className="px-8 py-5 text-right w-44">Due Balance</th>
                                        <th className="px-8 py-5 text-center w-48 tracking-[0.3em]">Validation</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-slate-700">
                                    {filteredPurchases.map((p: any) => (
                                        <tr key={p.id} className="hover:bg-slate-50/80 transition-all group/row">
                                            <td className="px-8 py-5">
                                                <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">{isClient && p.createdAt ? format(new Date(p.createdAt), "dd/MM/yy") : "..."}</div>
                                                <div className="font-mono text-[9px] font-black text-slate-300 uppercase tracking-tighter truncate" title={p.receiptNumber || ""}>{p.receiptNumber || "-"}</div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="font-black text-slate-900 tracking-tight mb-1 truncate max-w-[250px]" title={p.receivedFrom}>{p.receivedFrom}</div>
                                                <div className={cn(
                                                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-[0.2em] border",
                                                    p.isVerified ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                                                )}>
                                                    {p.isVerified ? "Warehouse Verified" : "Awaiting Warehouse"}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col gap-1">
                                                    <span className={cn(
                                                        "flex items-center gap-1.5 font-black text-[10px] uppercase tracking-widest",
                                                        p.paymentStatus === 'PAID' ? 'text-emerald-500' : 'text-amber-500'
                                                    )}>
                                                        <Clock className={cn("h-3 w-3", p.paymentStatus === 'PAID' ? 'hidden' : '')} /> {p.paymentStatus === 'PAID' ? 'DONE' : p.paymentStatus}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="font-black text-slate-900 tabular-nums tracking-tighter text-base">{formatCurrency(p.total)}</div>
                                                {Number(p.paidAmount || 0) > 0 && (
                                                    <div className="text-[9px] text-emerald-500 font-black uppercase tracking-widest mt-1">
                                                        Settled: {formatCurrency(Number(p.paidAmount))}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="font-black text-rose-500 tabular-nums tracking-tighter text-base">{formatCurrency(Number(p.total) - Number(p.paidAmount || 0))}</div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col gap-2 scale-90 origin-right">
                                                    {p.paymentStatus === 'PENDING' && (
                                                        <>
                                                            <button
                                                                disabled={loading === p.id || (!p.isVerified && !isAdmin)}
                                                                onClick={() => handleVerifyPayment("PURCHASE", p.id, "CREDIT")}
                                                                className="erp-btn-secondary !py-2 !text-[9px] !rounded-lg"
                                                            >
                                                                {loading === p.id ? "..." : "RECORD DEBT"}
                                                            </button>
                                                            <button
                                                                disabled={loading === p.id || (!p.isVerified && !isAdmin)}
                                                                onClick={() => handlePartialPayment("PURCHASE", p.id, Number(p.total), 0, p.receivedFrom)}
                                                                className="erp-btn-secondary !py-2 !text-[9px] !rounded-lg !bg-blue-50 !text-blue-600 !border-blue-100"
                                                            >
                                                                {loading === p.id ? "..." : "DEBT + DP"}
                                                            </button>
                                                        </>
                                                    )}
                                                    {(p.paymentStatus === 'CREDIT' || p.paymentStatus === 'PARTIAL') && (
                                                        <button
                                                            disabled={loading === p.id}
                                                            onClick={() => handlePartialPayment("PURCHASE", p.id, Number(p.total), Number(p.paidAmount || 0), p.receivedFrom)}
                                                            className="erp-btn-secondary !py-2 !text-[9px] !rounded-lg !bg-blue-50 !text-blue-600 !border-blue-100"
                                                        >
                                                            PARTIAL PAY
                                                        </button>
                                                    )}
                                                    <button
                                                        disabled={loading === p.id || (!p.isVerified && !isAdmin)}
                                                        onClick={() => handleVerifyPayment("PURCHASE", p.id, "PAID")}
                                                        className="erp-btn-primary !py-2 !text-[9px] !rounded-lg"
                                                    >
                                                        {loading === p.id ? "..." : (p.paymentStatus === 'PENDING' ? "FULL CASH" : "SETTLE BALANCE")}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Mobile Card View */}
                            <div className="md:hidden p-4 space-y-4">
                                {filteredPurchases.map((p: any) => (
                                    <div key={p.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isClient && p.createdAt ? format(new Date(p.createdAt), "dd MMM yyyy") : "..."}</span>
                                                <div className="font-mono text-[9px] text-slate-300 uppercase tracking-tighter truncate w-32">{p.receiptNumber || "-"}</div>
                                            </div>
                                            <div className={cn(
                                                "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border",
                                                p.isVerified ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                                            )}>
                                                {p.isVerified ? "Stock Verified" : "Stock Pending"}
                                            </div>
                                        </div>
                                        <div className="mb-4">
                                            <div className="font-black text-slate-900 text-sm leading-tight mb-2">{p.receivedFrom}</div>
                                            <div className="flex justify-between items-center bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Due Balance</span>
                                                    <span className="text-sm font-black text-rose-500 tabular-nums">{formatCurrency(Number(p.total) - Number(p.paidAmount || 0))}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">State</span>
                                                    <div className={cn(
                                                        "text-[10px] font-black uppercase tracking-widest",
                                                        p.paymentStatus === 'PAID' ? "text-emerald-500" : "text-amber-500"
                                                    )}>
                                                        {p.paymentStatus === 'PAID' ? 'DONE' : p.paymentStatus}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {p.paymentStatus === 'PENDING' && (
                                                <button
                                                    disabled={loading === p.id || (!p.isVerified && !isAdmin)}
                                                    onClick={() => handleVerifyPayment("PURCHASE", p.id, "CREDIT")}
                                                    className="erp-btn-secondary !py-2 !text-[9px] !rounded-lg"
                                                >
                                                    DEBT
                                                </button>
                                            )}
                                            <button
                                                disabled={loading === p.id || (!p.isVerified && !isAdmin)}
                                                onClick={() => handleVerifyPayment("PURCHASE", p.id, "PAID")}
                                                className="erp-btn-primary !py-2 !text-[9px] !rounded-lg col-span-1"
                                            >
                                                SETTLE
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>


                        <div className="mt-8 border-t pt-6">
                            <h3 className="text-lg font-bold text-rose-800 mb-4 capitalize">Pengajuan Retur Pembelian (Pending)</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-rose-50 border-b border-rose-100 text-rose-800 text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4">No. Retur</th>
                                            <th className="px-6 py-4">Tanggal Pengajuan</th>
                                            <th className="px-6 py-4">Ref. LPB</th>
                                            <th className="px-6 py-4">Vendor</th>
                                            <th className="px-6 py-4 text-center">Qty Diretur</th>
                                            <th className="px-6 py-4 text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-rose-50">
                                        {Array.isArray(filteredReturns) && filteredReturns.map((r: any) => (
                                            <tr key={r.id} className="hover:bg-rose-50/50 transition-colors">

                                                <td className="px-6 py-4 font-mono font-bold text-rose-600">{r.returnNumber}</td>
                                                <td className="px-6 py-4 text-slate-500">{format(new Date(r.date || r.createdAt), "dd/MM/yyyy")}</td>
                                                <td className="px-6 py-4 text-slate-600">{r.receipt?.receiptNumber}</td>
                                                <td className="px-6 py-4 font-medium text-slate-700">{r.receipt?.receivedFrom}</td>
                                                <td className="px-6 py-4 text-center font-bold text-rose-600">
                                                    {r.items?.reduce((acc: number, i: any) => acc + i.quantity, 0)} Items
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        disabled={loading === r.id}
                                                        onClick={() => handleVerifyReturn(r.id, r.receipt?.receivedFrom)}
                                                        className="bg-rose-600 text-white px-4 py-1.5 rounded text-xs font-bold hover:bg-rose-700 shadow-sm transition-all disabled:opacity-50"
                                                    >
                                                        {loading === r.id ? "..." : "Verifikasi Retur"}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredReturns.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-rose-400 italic">
                                                    Tidak ada pengajuan retur pembelian yang pending.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === "ar" && (
                    <>
                        <div className="overflow-x-auto custom-scrollbar">
                            {/* Desktop Table */}
                            <table className="w-full text-sm text-left min-w-[900px] table-fixed hidden md:table">
                                <thead className="bg-slate-50/50 text-slate-400 border-b border-slate-100 text-[10px] uppercase tracking-[0.2em] font-black">
                                    <tr>
                                        <th className="px-8 py-5 w-44">Timeline / Ref</th>
                                        <th className="px-8 py-5">Customer Profile</th>
                                        <th className="px-8 py-5 w-40">Credit State</th>
                                        <th className="px-8 py-5 text-right w-44">Gross Value</th>
                                        <th className="px-8 py-5 text-right w-44">Current Unpaid</th>
                                        <th className="px-8 py-5 text-center w-48 tracking-[0.3em]">Validation</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-slate-700">
                                    {Array.isArray(filteredSales) && filteredSales.map((s: any) => (
                                        <tr key={s.id} className="hover:bg-slate-50/80 transition-all group/row">
                                            <td className="px-8 py-5">
                                                <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">{isClient ? format(new Date(s.createdAt), "dd/MM/yy") : "..."}</div>
                                                <div className="font-mono text-[9px] font-black text-slate-300 uppercase tracking-tighter truncate" title={s.deliveryNumber}>{s.deliveryNumber}</div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="font-black text-slate-900 tracking-tight truncate max-w-[250px]" title={s.buyerName}>{s.buyerName}</div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn(
                                                        "h-1.5 w-1.5 rounded-full animate-pulse",
                                                        s.paymentStatus === 'PAID' ? 'bg-emerald-500 !animate-none' : 'bg-blue-500'
                                                    )} />
                                                    <span className={cn(
                                                        "font-black text-[10px] uppercase tracking-widest",
                                                        s.paymentStatus === 'PAID' ? 'text-emerald-500' : 'text-blue-500'
                                                    )}>
                                                        {s.paymentStatus === 'PAID' ? 'DONE' : s.paymentStatus}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="font-black text-slate-900 tabular-nums tracking-tighter text-base">{formatCurrency(s.total)}</div>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="font-black text-emerald-600 tabular-nums tracking-tighter text-base">
                                                    {formatCurrency(Number(s.total) - Number(s.paidAmount || 0))}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col gap-2 scale-90 origin-right">
                                                    {s.paymentStatus === 'PENDING' && (
                                                        <>
                                                            <button
                                                                disabled={loading === s.id}
                                                                onClick={() => handleVerifyPayment("SALE", s.id, "CREDIT")}
                                                                className="erp-btn-secondary !py-2 !text-[9px] !rounded-lg"
                                                            >
                                                                RECORD CREDIT
                                                            </button>
                                                            <button
                                                                disabled={loading === s.id}
                                                                onClick={() => handlePartialPayment("SALE", s.id, Number(s.total), 0, s.buyerName)}
                                                                className="erp-btn-secondary !py-2 !text-[9px] !rounded-lg !bg-emerald-50 !text-emerald-600 !border-emerald-100"
                                                            >
                                                                CREDIT + DP
                                                            </button>
                                                        </>
                                                    )}
                                                    {(s.paymentStatus === 'CREDIT' || s.paymentStatus === 'PARTIAL') && (
                                                        <button
                                                            disabled={loading === s.id}
                                                            onClick={() => handlePartialPayment("SALE", s.id, Number(s.total), Number(s.paidAmount || 0), s.buyerName)}
                                                            className="erp-btn-secondary !py-2 !text-[9px] !rounded-lg !bg-blue-50 !text-blue-600 !border-blue-100"
                                                        >
                                                            PARTIAL PAY
                                                        </button>
                                                    )}
                                                    <button
                                                        disabled={loading === s.id}
                                                        onClick={() => handleVerifyPayment("SALE", s.id, "PAID")}
                                                        className="erp-btn-primary !py-2 !text-[9px] !rounded-lg"
                                                    >
                                                        {loading === s.id ? "..." : (s.paymentStatus === 'PENDING' ? "FULL CASH" : "SETTLE BALANCE")}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Mobile Card View */}
                            <div className="md:hidden p-4 space-y-4">
                                {Array.isArray(filteredSales) && filteredSales.map((s: any) => (
                                    <div key={s.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isClient ? format(new Date(s.createdAt), "dd MMM yyyy") : "..."}</span>
                                                <div className="font-mono text-[9px] text-slate-300 uppercase tracking-tighter truncate w-32">{s.deliveryNumber}</div>
                                            </div>
                                            <div className={cn(
                                                "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                                                s.paymentStatus === 'PAID' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"
                                            )}>
                                                {s.paymentStatus === 'PAID' ? 'DONE' : s.paymentStatus}
                                            </div>
                                        </div>
                                        <div className="mb-4">
                                            <div className="font-black text-slate-900 text-sm leading-tight mb-2">{s.buyerName}</div>
                                            <div className="flex justify-between items-center bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Value</span>
                                                    <span className="text-sm font-black text-slate-900 tabular-nums">{formatCurrency(s.total)}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Unpaid</span>
                                                    <div className="text-sm font-black text-emerald-600 tabular-nums">{formatCurrency(Number(s.total) - Number(s.paidAmount || 0))}</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                disabled={loading === s.id}
                                                onClick={() => handleVerifyPayment("SALE", s.id, "PAID")}
                                                className="erp-btn-primary !py-2.5 !text-[10px] !rounded-xl col-span-2"
                                            >
                                                SETTLE PAYMENT
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Returns Panel (Refined) */}
                        <div className="mx-6 md:mx-4 mb-8 mt-12 bg-blue-50/30 rounded-[2rem] border border-blue-100 p-8">
                            <h3 className="text-xl font-black text-blue-900 tracking-tight uppercase flex items-center gap-3 mb-8">
                                <div className="h-2 w-4 bg-blue-600 rounded-full" />
                                Pending Sales Returns
                            </h3>
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-sm text-left hidden md:table">
                                    <thead className="text-[10px] uppercase font-black tracking-widest text-blue-400">
                                        <tr>
                                            <th className="pb-6">Return Number</th>
                                            <th className="pb-6">Log Date</th>
                                            <th className="pb-6">SJ Reference</th>
                                            <th className="pb-6 text-right">Items Retured</th>
                                            <th className="pb-6 text-center">Authorization</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-blue-100/50">
                                        {Array.isArray(filteredSalesReturns) && filteredSalesReturns.map((r: any) => (
                                            <tr key={r.id} className="group/ret">
                                                <td className="py-4 font-black text-blue-600">
                                                    <div>{r.returnNumber}</div>
                                                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{r.delivery?.buyerName}</div>
                                                </td>
                                                <td className="py-4 text-slate-500 font-bold">{format(new Date(r.date || r.createdAt), "dd/MM/yyyy")}</td>
                                                <td className="py-4 text-slate-600 font-mono text-[10px]">{r.delivery?.deliveryNumber}</td>
                                                <td className="py-4 text-right font-black text-blue-500 text-base tabular-nums">
                                                    {r.items?.reduce((acc: number, i: any) => acc + i.quantity, 0)} <span className="text-[9px] tracking-widest">PCS</span>
                                                </td>
                                                <td className="py-4 text-center">
                                                    <button
                                                        disabled={loading === r.id}
                                                        onClick={() => handleVerifySalesReturn(r.id, r.delivery?.buyerName)}
                                                        className="erp-btn-primary !bg-blue-600 hover:!bg-blue-700 !py-2 !px-6 !text-[10px] !rounded-xl"
                                                    >
                                                        {loading === r.id ? "..." : "APPROVE RETURN"}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === "checker" && (
                    <div className="overflow-x-auto custom-scrollbar p-0">
                         {/* Desktop Layout */}
                        <table className="w-full text-sm text-left min-w-[900px] table-fixed hidden md:table">
                            <thead className="bg-slate-50/50 text-slate-400 border-b border-slate-100 text-[10px] uppercase tracking-[0.2em] font-black">
                                <tr>
                                    <th className="px-8 py-5 w-44">Log Date / LPB Ref</th>
                                    <th className="px-8 py-5">Vendor Entity</th>
                                    <th className="px-8 py-5 w-32 text-center">SKU Count</th>
                                    <th className="px-8 py-5 w-48">Storage Target</th>
                                    <th className="px-8 py-5 text-center w-40 tracking-[0.2em]">Flow State</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-slate-700">
                                {Array.isArray(unverifiedReceipts) && unverifiedReceipts.map((r: any) => (
                                    <tr key={r.id} className="hover:bg-slate-50/80 transition-all">
                                        <td className="px-8 py-5">
                                            <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">{isClient ? format(new Date(r.createdAt), "dd/MM/yy") : "..."}</div>
                                            <div className="font-mono text-[9px] font-black text-slate-300 uppercase tracking-tighter truncate">{r.receiptNumber}</div>
                                        </td>
                                        <td className="px-8 py-5 font-black text-slate-900 tracking-tight">{r.receivedFrom}</td>
                                        <td className="px-8 py-5 text-center font-black tabular-nums">{r.items.length}</td>
                                        <td className="px-8 py-5">
                                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100/50 px-3 py-1.5 rounded-lg border border-slate-100 inline-block">
                                                {r.warehouse?.name}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center gap-2">
                                                <Clock className="h-3 w-3" /> PENDING CHECK
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Mobile Cards for Checker */}
                        <div className="md:hidden p-4 space-y-4">
                            {Array.isArray(unverifiedReceipts) && unverifiedReceipts.map((r: any) => (
                                <div key={r.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm border-l-4 border-l-amber-400">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isClient ? format(new Date(r.createdAt), "dd MMM yyyy") : "..."}</span>
                                            <div className="font-mono text-[9px] text-slate-300 uppercase tracking-tighter truncate w-32">{r.receiptNumber}</div>
                                        </div>
                                        <div className="px-2 py-1 bg-amber-50 rounded-lg text-[9px] font-black text-amber-600 uppercase border border-amber-100">
                                            Awaiting Gudang
                                        </div>
                                    </div>
                                    <div className="mb-0">
                                        <div className="font-black text-slate-900 text-sm leading-tight mb-2">{r.receivedFrom}</div>
                                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Destination: {r.warehouse?.name}</div>
                                        <div className="text-[10px] font-black text-primary uppercase tracking-widest mt-2">{r.items.length} Product SKU in shipment</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === "purchase_requests" && (
                     <div className="overflow-x-auto custom-scrollbar p-0">
                        {/* Desktop View */}
                        <table className="w-full text-sm text-left min-w-[900px] table-fixed hidden md:table">
                            <thead className="bg-slate-50/50 text-slate-400 border-b border-slate-100 text-[10px] uppercase tracking-[0.2em] font-black">
                                <tr>
                                    <th className="px-8 py-5 w-44">Timeline / Ref</th>
                                    <th className="px-8 py-5">Pemohon</th>
                                    <th className="px-8 py-5">Kategori</th>
                                    <th className="px-8 py-5 text-right w-40">Load (Items)</th>
                                    <th className="px-8 py-5 text-center w-48 tracking-[0.3em]">Decision</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-slate-700">
                                {Array.isArray(filteredPurchaseRequests) && filteredPurchaseRequests.map((r: any) => (
                                    <tr key={r.id} className="hover:bg-slate-50/80 transition-all">
                                        <td className="px-8 py-5">
                                            <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">{isClient ? format(new Date(r.createdAt), "dd/MM/yy") : "..."}</div>
                                            <div className="font-mono text-[9px] font-black text-slate-300 uppercase tracking-tighter truncate">{r.number}</div>
                                        </td>
                                        <td className="px-8 py-5 font-black text-slate-900 tracking-tight">{r.requestedBy?.name}</td>
                                        <td className="px-8 py-5">
                                            <span className={cn(
                                                "text-[9px] font-black uppercase px-2 py-0.5 rounded border",
                                                r.category === "OPERASIONAL" 
                                                    ? "bg-indigo-50 text-indigo-600 border-indigo-100" 
                                                    : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                            )}>
                                                {r.category || "PEMBELIAN"}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right font-black tabular-nums">{r.items.length} Items</td>
                                        <td className="px-8 py-5 text-center">
                                            <button
                                                disabled={loading === r.id}
                                                onClick={() => handleVerifyPurchaseRequest(r.id, r.number)}
                                                className="erp-btn-primary !bg-amber-500 hover:!bg-amber-600 !py-2 !px-6 !text-[10px] !rounded-xl shadow-lg shadow-amber-100 w-full"
                                            >
                                                {loading === r.id ? "..." : "VERIFIKASI FINANCE"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Mobile Cards for PR */}
                        <div className="md:hidden p-4 space-y-4">
                             {Array.isArray(filteredPurchaseRequests) && filteredPurchaseRequests.map((r: any) => (
                                <div key={r.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm border-l-4 border-l-amber-500">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isClient ? format(new Date(r.createdAt), "dd MMM yyyy") : "..."}</span>
                                            <div className="font-mono text-[9px] text-slate-300 uppercase tracking-tighter truncate w-32">{r.number}</div>
                                        </div>
                                        <div className="px-2 py-1 bg-amber-50 rounded-lg text-[9px] font-black text-amber-600 uppercase border border-amber-100">
                                            {r.category || "PEMBELIAN"}
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <div className="font-black text-slate-900 text-sm leading-tight mb-2">Requester: {r.requestedBy?.name}</div>
                                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Warehouse: {r.warehouse?.name}</div>
                                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-2">{r.items.length} Requested SKU Line Items</p>
                                    </div>
                                    <button
                                        disabled={loading === r.id}
                                        onClick={() => handleVerifyPurchaseRequest(r.id, r.number)}
                                        className="w-full erp-btn-primary !bg-amber-500 hover:!bg-amber-600 !py-3 !rounded-xl"
                                    >
                                        APPROVE & REALIZE
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === "history" && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Settled Invoices Section */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 px-1">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Pelunasan Piutang & Hutang (Recent Settlements)</h3>
                                <div className="flex items-center gap-2 ml-auto">
                                    <select 
                                        value={historyMonth}
                                        onChange={(e) => setHistoryMonth(e.target.value)}
                                        className="text-[10px] font-black uppercase tracking-widest bg-white border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                    >
                                        <option value="ALL">All Months</option>
                                        <option value="1">Januari</option>
                                        <option value="2">Februari</option>
                                        <option value="3">Maret</option>
                                        <option value="4">April</option>
                                        <option value="5">Mei</option>
                                        <option value="6">Juni</option>
                                        <option value="7">Juli</option>
                                        <option value="8">Agustus</option>
                                        <option value="9">September</option>
                                        <option value="10">Oktober</option>
                                        <option value="11">November</option>
                                        <option value="12">Desember</option>
                                    </select>
                                </div>
                            </div>
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-sm text-left min-w-[1000px] table-fixed">
                                    <thead className="bg-slate-50/50 text-slate-400 border-b border-slate-100 text-[10px] uppercase tracking-[0.2em] font-black">
                                        <tr>
                                            <th className="px-8 py-5 w-40">Tgl Lunas</th>
                                            <th className="px-8 py-5">Entity / Counterparty</th>
                                            <th className="px-8 py-5 w-48">Ref Number</th>
                                            <th className="px-8 py-5 w-40 text-center">Tipe</th>
                                            <th className="px-8 py-5 text-right w-44">Settled Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 text-slate-700">
                                        {/* Settled Sales (AR) */}
                                        {filteredSettledSales.map((s: any) => (
                                            <tr key={`sale-${s.id}`} onClick={() => setSelectedHistoryItem({ ...s, historyType: 'AR' })} className="hover:bg-blue-50/50 transition-all group/row cursor-pointer">
                                                <td className="px-8 py-5 text-slate-400 font-bold tabular-nums">
                                                    {isClient && s.updatedAt ? format(new Date(s.updatedAt), "dd/MM/yy") : "..."}
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="font-black text-slate-900 tracking-tight mb-1 truncate">{s.buyerName}</div>
                                                    <div className="text-[9px] text-emerald-500 font-black uppercase tracking-widest flex items-center gap-2">
                                                        <span>Customer Payment (AR)</span>
                                                        <span className="h-1 w-1 bg-slate-300 rounded-full" />
                                                        <span className="text-slate-400">By: {s.createdBy?.name || 'Finance'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 font-mono text-[10px] font-bold text-slate-500">{s.deliveryNumber}</td>
                                                <td className="px-8 py-5 text-center">
                                                    <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-emerald-50 text-emerald-600 border-emerald-100">PELUNASAN</span>
                                                </td>
                                                <td className="px-8 py-5 text-right font-black tabular-nums tracking-tighter text-base text-emerald-600">
                                                    {formatCurrency(Number(s.total))}
                                                </td>
                                            </tr>
                                        ))}
                                        {/* Settled Purchases (AP) */}
                                        {filteredSettledPurchases.map((p: any) => (
                                            <tr key={`purchase-${p.id}`} onClick={() => setSelectedHistoryItem({ ...p, historyType: 'AP' })} className="hover:bg-rose-50/50 transition-all group/row cursor-pointer">
                                                <td className="px-8 py-5 text-slate-400 font-bold tabular-nums">
                                                    {isClient && p.updatedAt ? format(new Date(p.updatedAt), "dd/MM/yy") : "..."}
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="font-black text-slate-900 tracking-tight mb-1 truncate">{p.receivedFrom}</div>
                                                    <div className="text-[9px] text-rose-500 font-black uppercase tracking-widest flex items-center gap-2">
                                                        <span>Vendor Settlement (AP)</span>
                                                        <span className="h-1 w-1 bg-slate-300 rounded-full" />
                                                        <span className="text-slate-400">By: {p.createdBy?.name || 'Finance'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 font-mono text-[10px] font-bold text-slate-500">{p.receiptNumber}</td>
                                                <td className="px-8 py-5 text-center">
                                                    <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-rose-50 text-rose-600 border-rose-100">PEMBAYARAN</span>
                                                </td>
                                                <td className="px-8 py-5 text-right font-black tabular-nums tracking-tighter text-base text-rose-600">
                                                    {formatCurrency(Number(p.total))}
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredSettledSales.length === 0 && filteredSettledPurchases.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-8 py-12 text-center text-slate-400 italic font-medium uppercase tracking-widest text-[10px]">No settled invoices found in recent history</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Operational Transactions Section */}
                        <div className="space-y-6 pt-6 border-t border-slate-100">
                            <div className="flex items-center gap-3 px-1">
                                <div className="h-8 w-1 bg-blue-500 rounded-full" />
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Operational & Cash Movements</h3>
                            </div>
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-sm text-left min-w-[1000px] table-fixed hidden md:table">
                                    <thead className="bg-slate-50/50 text-slate-400 border-b border-slate-100 text-[10px] uppercase tracking-[0.2em] font-black">
                                        <tr>
                                            <th className="px-8 py-5 w-32 tracking-[0.3em]">Tgl Log</th>
                                            <th className="px-8 py-5">Main Description</th>
                                            <th className="px-8 py-5 w-40">Entry Type</th>
                                            <th className="px-8 py-5 w-40 text-right">Magnitude</th>
                                            <th className="px-8 py-5 w-48">Logged By</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 text-slate-700">
                                        {Array.isArray(transactions) && transactions.map((tx: any) => (
                                            <tr key={tx.id} className="hover:bg-slate-50/80 transition-all">
                                                <td className="px-8 py-5 text-slate-400 font-bold tabular-nums">
                                                    {isClient && tx.date ? format(new Date(tx.date), "dd/MM/yy") : "..."}
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="font-black text-slate-900 tracking-tight leading-none mb-1.5 truncate max-w-[400px]">{tx.description}</div>
                                                    <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest">REF: {tx.referenceNumber || 'INTERNAL'}</div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className={cn(
                                                        "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                                        tx.amount >= 0 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"
                                                    )}>
                                                        {tx.transactionType || (tx.amount >= 0 ? 'IN' : 'OUT')}
                                                    </span>
                                                </td>
                                                <td className={cn(
                                                    "px-8 py-5 text-right font-black tabular-nums tracking-tighter text-base",
                                                    tx.amount >= 0 ? "text-slate-900" : "text-rose-500"
                                                )}>
                                                    {formatCurrency(Math.abs(Number(tx.amount)))}
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{tx.createdBy?.name || 'Authorized'}</div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

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
                                <button onClick={() => fetchClosingReport(closingPeriod.month, closingPeriod.year)} className="mt-4 px-6 py-2 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Coba Lagi</button>
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
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Partner Summaries & Insights */}
            {(activeTab === "ap" || activeTab === "ar") && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 erp-card overflow-hidden bg-white/40">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                                {activeTab === "ap" ? "Top Creditor Entities" : "Top Debtors / Active Accounts"}
                            </h3>
                            <button className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">View All Balances</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50/50 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    <tr>
                                        <th className="px-8 py-4">Counterparty</th>
                                        <th className="px-8 py-4 text-right">Commitment Value</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {(activeTab === "ap" ? vendors : customers).slice(0, 8).map((v: any) => (
                                        <tr key={v.id} className="hover:bg-white/60 transition-colors">
                                            <td className="px-8 py-4 font-bold text-slate-700">{v.name}</td>
                                            <td className={cn(
                                                "px-8 py-4 text-right font-black tabular-nums tracking-tighter",
                                                activeTab === "ap" ? "text-rose-500" : "text-emerald-500"
                                            )}>
                                                {formatCurrency(v.balance || 0)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    {/* Visual Insight Card (placeholder for future charts) */}
                    <div className="erp-card p-8 bg-slate-900 text-white relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Banknote className="h-40 w-40" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Liquidity Snapshot</p>
                            <h4 className="text-2xl font-black tracking-tight">{activeTab === "ap" ? 'Liability Portfolio' : 'Receivable Health'}</h4>
                        </div>
                        <div className="relative z-10 mt-12 space-y-6">
                            <div className="flex justify-between items-end border-b border-white/10 pb-4">
                                <span className="text-xs font-bold text-slate-400">Aging {">"} 30 Days</span>
                                <span className="text-xl font-black tabular-nums">{formatCurrency(0)}</span>
                            </div>
                            <div className="flex justify-between items-end border-b border-white/10 pb-4">
                                <span className="text-xs font-bold text-slate-400">Due This Week</span>
                                <span className="text-xl font-black tabular-nums">{formatCurrency(activeTab === "ap" ? totalHutang : totalPiutang)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Account Matrix for Ledger */}
            {activeTab === "ledger" && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 px-1">
                    {Array.isArray(accounts) && accounts.map((account: any) => (
                        <div key={account.id} className="erp-card p-5 bg-white/60 hover:border-primary/40 transition-all group cursor-pointer border-slate-200/50">
                            <div className="flex justify-between items-start mb-4">
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded-md group-hover:bg-primary group-hover:text-white transition-colors">{account.code}</div>
                                <Wallet className="h-3.5 w-3.5 text-slate-300 group-hover:text-primary transition-colors" />
                            </div>
                            <h3 className="text-[11px] font-black text-slate-800 leading-tight mb-2 uppercase tracking-tight line-clamp-1">{account.name}</h3>
                            <p className="text-sm font-black text-slate-900 tracking-tighter tabular-nums">{formatCurrency(account.balance || 0)}</p>
                        </div>
                    ))}
                </div>
            )}
            </div>

            {/* Premium Modals Handling */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowModal(false)} />
                    <div className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <FinanceModal
                            accounts={accounts}
                            onClose={() => setShowModal(false)}
                        />
                    </div>
                </div>
            )}

            {showPreview && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowPreview(false)} />
                    <div className="relative w-full max-w-6xl bg-white rounded-[3rem] shadow-2xl overflow-hidden h-[90vh] flex flex-col animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50 flex-shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-primary">
                                    <Eye className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{previewTitle}</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Internal Verification Engine</p>
                                </div>
                            </div>
                            <button onClick={() => setShowPreview(false)} className="p-3 hover:bg-white hover:text-rose-500 rounded-2xl transition-all"><X className="h-6 w-6" /></button>
                        </div>
                        <div className="flex-1 overflow-auto p-12 custom-scrollbar">
                            <ReportPreviewModal
                                title={previewTitle}
                                data={previewData}
                                onClose={() => setShowPreview(false)}
                                onExport={handleExport}
                            />
                        </div>
                    </div>
                </div>
            )}

            {selectedHistoryItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSelectedHistoryItem(null)} />
                    <div className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className={cn(
                            "p-8 border-b border-slate-100 flex items-center justify-between",
                            selectedHistoryItem.historyType === 'AR' ? "bg-emerald-50/50" : "bg-rose-50/50"
                        )}>
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "p-3 rounded-2xl shadow-sm border",
                                    selectedHistoryItem.historyType === 'AR' ? "bg-white text-emerald-600 border-emerald-100" : "bg-white text-rose-600 border-rose-100"
                                )}>
                                    <Clock className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{selectedHistoryItem.historyType === 'AR' ? 'AR Settlement Detail' : 'AP Settlement Detail'}</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verified History Log</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedHistoryItem(null)} className="p-3 hover:bg-white hover:text-rose-500 rounded-2xl transition-all"><X className="h-6 w-6" /></button>
                        </div>
                        
                        <div className="p-10 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Doc Number</p>
                                    <p className="font-black text-slate-900">{selectedHistoryItem.deliveryNumber || selectedHistoryItem.receiptNumber}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Counterparty</p>
                                    <p className="font-black text-slate-900">{selectedHistoryItem.buyerName || selectedHistoryItem.receivedFrom}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Settlement Date</p>
                                    <p className="font-black text-slate-900">{selectedHistoryItem.updatedAt ? format(new Date(selectedHistoryItem.updatedAt), "dd MMMM yyyy") : "-"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verified By</p>
                                    <p className="font-black text-emerald-600">{selectedHistoryItem.createdBy?.name || 'Finance Authorized'}</p>
                                </div>
                            </div>

                            <div className="erp-card overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4 text-left">Product SKU & Name</th>
                                            <th className="px-6 py-4 text-center">Qty</th>
                                            <th className="px-6 py-4 text-right">Price</th>
                                            <th className="px-6 py-4 text-right">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {selectedHistoryItem.items?.map((item: any, idx: number) => (
                                            <tr key={idx}>
                                                <td className="px-6 py-4">
                                                    <div className="font-black text-slate-900 leading-none mb-1">{item.product?.sku}</div>
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[250px]">{item.product?.name}</div>
                                                </td>
                                                <td className="px-6 py-4 text-center font-black tabular-nums">{item.quantity} {item.uom || item.product?.uom}</td>
                                                <td className="px-6 py-4 text-right font-black tabular-nums text-slate-500">{formatCurrency(Number(item.purchasePrice || item.salesPrice || 0))}</td>
                                                <td className="px-6 py-4 text-right font-black tabular-nums text-slate-900">{formatCurrency(Number(item.quantity) * Number(item.purchasePrice || item.salesPrice || 0))}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-50/50 font-black">
                                        <tr>
                                            <td colSpan={3} className="px-6 py-4 text-right text-slate-500 uppercase text-[10px]">Grand Total Settled</td>
                                            <td className="px-6 py-4 text-right text-lg tracking-tighter text-slate-900">{formatCurrency(Number(selectedHistoryItem.total || selectedHistoryItem.grandTotal || 0))}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Unified Professional Payment Modal */}
            {paymentModal && (() => {
                const remaining = paymentModal.total - (paymentModal.alreadyPaid || 0);
                const progress = paymentModal.total > 0 ? Math.round(((paymentModal.alreadyPaid || 0) / paymentModal.total) * 100) : 0;
                const currentAmount = Number(paymentAmount) || 0;
                const isLunas = currentAmount >= remaining;
                const isValid = currentAmount > 0 && currentAmount <= (remaining + 1); // Allow small rounding margin

                return (
                    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="absolute inset-0" onClick={() => setPaymentModal(null)} />
                        <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300">
                            {/* Visual Header */}
                            <div className="p-8 bg-slate-900 text-white relative">
                                <div className="absolute top-0 right-0 p-8 opacity-10">
                                    <Banknote className="h-24 w-24" />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-2xl font-black tracking-tight uppercase">Payment Allocation</h3>
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">{paymentModal.type === "PURCHASE" ? "Accounts Payable" : "Accounts Receivable"} Verification</p>
                                </div>
                            </div>

                            <div className="p-8 space-y-8">
                                {/* Account Context Cards */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between h-24">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Entry Ref</span>
                                        <span className="text-[11px] font-black text-slate-900 leading-tight">{paymentModal.supplierName || 'System Ref'}</span>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between h-24">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Progress</span>
                                        <div className="flex items-center gap-2 justify-end">
                                            <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500" style={{ width: `${progress}%` }} />
                                            </div>
                                            <span className="text-[11px] font-black text-slate-900 tabular-nums">{progress}%</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Financial Detail */}
                                <div className="space-y-4">
                                     <div className="flex justify-between items-center bg-rose-50/50 p-6 rounded-[2rem] border border-rose-100 border-dashed">
                                        <span className="text-[11px] font-black text-rose-500 uppercase tracking-widest">Outstanding Due</span>
                                        <span className="text-2xl font-black text-rose-600 tabular-nums tracking-tighter">{formatCurrency(remaining)}</span>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Allocation Amount</label>
                                        <div className="relative">
                                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-lg font-black text-slate-300">Rp</span>
                                            <input
                                                ref={paymentInputRef}
                                                type="number"
                                                value={paymentAmount}
                                                onChange={e => setPaymentAmount(e.target.value)}
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-6 pl-14 text-2xl font-black text-slate-900 outline-none focus:border-primary transition-all shadow-inner"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        {currentAmount > 0 && (
                                            <div className="px-4">
                                                <p className={cn("text-[10px] font-black uppercase tracking-widest", isLunas ? "text-emerald-500" : "text-blue-500")}>
                                                    {isLunas ? "✓ Authorized for full settlement" : `Remaining post-allocation: ${formatCurrency(remaining - currentAmount)}`}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        {[0.25, 0.5, 0.75, 1].map((pct) => (
                                            <button
                                                key={pct}
                                                onClick={() => setPaymentAmount(String(Math.round(remaining * pct)))}
                                                className="px-3 py-2 bg-slate-100 text-slate-500 text-[10px] font-black rounded-xl hover:bg-slate-200 transition-colors uppercase tracking-[0.1em]"
                                            >
                                                {pct === 1 ? 'MAX' : `${pct * 100}%`}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Posting Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                            <input
                                                type="date"
                                                value={paymentDate}
                                                onChange={e => setPaymentDate(e.target.value)}
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pl-12 text-[11px] font-black text-slate-600 uppercase tracking-[0.2em] outline-none focus:border-primary transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        onClick={() => setPaymentModal(null)}
                                        className="flex-1 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        disabled={!isValid}
                                        onClick={handlePaymentModalSubmit}
                                        className="flex-1 erp-btn-primary !py-4 shadow-xl shadow-primary/20 disabled:opacity-50"
                                    >
                                        {isLunas ? 'Authorize Settlement' : 'Verify Allocation'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
