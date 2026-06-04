"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Calendar,
  Wallet,
  ArrowRightLeft,
  Search,
  Download,
  Edit2,
  X,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  FileCheck2,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { callAction } from "@/proxy";
import { exportToExcel } from "@/lib/excel";

interface TaxDashboardProps {
  systemSettings?: any;
}

export default function TaxDashboard({ systemSettings }: TaxDashboardProps) {
  const [salesDeliveries, setSalesDeliveries] = useState<any[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"KELUARAN" | "MASUKAN">("KELUARAN");
  
  // Date filters
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  // Custom Date range
  const [startDateStr, setStartDateStr] = useState<string>(
    format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd")
  );
  const [endDateStr, setEndDateStr] = useState<string>(
    format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), "yyyy-MM-dd")
  );
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [modalForm, setModalForm] = useState({
    taxInvoiceNumber: "",
    taxInvoiceDate: ""
  });
  const [saving, setSaving] = useState(false);

  const loadTaxData = async () => {
    try {
      setLoading(true);
      const res = await callAction("getTaxDataAction", undefined, undefined, startDateStr, endDateStr);
      if (res.success) {
        setSalesDeliveries(res.salesDeliveries || []);
        setGoodsReceipts(res.goodsReceipts || []);
      } else {
        alert(res.error || "Gagal memuat data perpajakan.");
      }
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan sistem.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const firstDay = format(new Date(selectedYear, selectedMonth - 1, 1), "yyyy-MM-dd");
    const lastDay = format(new Date(selectedYear, selectedMonth, 0), "yyyy-MM-dd");
    setStartDateStr(firstDay);
    setEndDateStr(lastDay);
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    loadTaxData();
  }, [startDateStr, endDateStr]);

  // Calculations
  const totalKeluaran = salesDeliveries.reduce((sum, item) => sum + Number(item.taxAmount || 0), 0);
  const totalMasukan = goodsReceipts.reduce((sum, item) => sum + Number(item.taxAmount || 0), 0);
  const netPPN = totalKeluaran - totalMasukan;
  
  const dppKeluaran = salesDeliveries.reduce((sum, item) => sum + (Number(item.subtotal || 0) - Number(item.totalDiscount || 0)), 0);
  const dppMasukan = goodsReceipts.reduce((sum, item) => sum + (Number(item.subtotal || 0) - Number(item.totalDiscount || 0)), 0);

  // Search filter
  const filteredKeluaran = salesDeliveries.filter(d => 
    d.deliveryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.taxInvoiceNumber && d.taxInvoiceNumber.includes(searchTerm))
  );

  const filteredMasukan = goodsReceipts.filter(r =>
    r.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.receivedFrom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.taxInvoiceNumber && r.taxInvoiceNumber.includes(searchTerm))
  );

  // Open Edit NSFP Modal
  const handleOpenEdit = (item: any) => {
    setEditItem(item);
    setModalForm({
      taxInvoiceNumber: item.taxInvoiceNumber || "",
      taxInvoiceDate: item.taxInvoiceDate ? format(new Date(item.taxInvoiceDate), "yyyy-MM-dd") : ""
    });
    setShowEditModal(true);
  };

  // Submit NSFP update
  const handleSaveTaxInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;

    try {
      setSaving(true);
      const actionName = activeTab === "KELUARAN" 
        ? "updateSalesTaxInvoiceAction" 
        : "updatePurchaseTaxInvoiceAction";
      
      const res = await callAction(
        actionName, 
        editItem.id, 
        modalForm.taxInvoiceNumber || null, 
        modalForm.taxInvoiceDate || null
      );

      if (res.success) {
        alert("Nomor Seri Faktur Pajak (NSFP) berhasil diperbarui!");
        setShowEditModal(false);
        setEditItem(null);
        loadTaxData();
      } else {
        alert(res.error || "Gagal memperbarui faktur.");
      }
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan perubahan.");
    } finally {
      setSaving(false);
    }
  };

  // Export CoreTax XML ( e-Faktur Bulk Upload)
  const handleDownloadCoretax = async () => {
    if (salesDeliveries.length === 0) {
      alert("Tidak ada data PPN Keluaran untuk diekspor.");
      return;
    }
    
    try {
      const { generateCoretaxXML } = await import("@/lib/coretax-xml");
      const xmlContent = generateCoretaxXML(salesDeliveries, systemSettings);
      const blob = new Blob([xmlContent], { type: "text/xml" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Coretax_EFaktur_Keluaran_${startDateStr}_to_${endDateStr}.xml`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e: any) {
      alert("Gagal mengekspor XML: " + e.message);
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    const data = activeTab === "KELUARAN" ? filteredKeluaran : filteredMasukan;
    const exportData = data.map((item, idx) => {
      const isKeluaran = activeTab === "KELUARAN";
      return {
        "No": idx + 1,
        "Tanggal Transaksi": format(new Date(item.date || item.createdAt), "dd/MM/yyyy"),
        "Nomor Dokumen": isKeluaran ? item.deliveryNumber : item.receiptNumber,
        "Nomor Penjualan (Invoice)": isKeluaran ? (item.invoiceNumber || "-") : "-",
        "Keterangan Pihak Kedua": isKeluaran ? item.buyerName : item.receivedFrom,
        "DPP (Omzet Bersih)": Number(item.subtotal),
        "Tarif PPN": `${(Number(item.taxRate || 0) * 100).toFixed(0)}%`,
        "Jumlah PPN": Number(item.taxAmount),
        "Grand Total": Number(item.grandTotal),
        "Nomor Faktur Pajak (NSFP)": item.taxInvoiceNumber || "-",
        "Tanggal Faktur Pajak": item.taxInvoiceDate ? format(new Date(item.taxInvoiceDate), "dd/MM/yyyy") : "-"
      };
    });

    const filename = activeTab === "KELUARAN" 
      ? `Laporan_PPN_Keluaran_${startDateStr}_to_${endDateStr}`
      : `Laporan_PPN_Masukan_${startDateStr}_to_${endDateStr}`;
      
    exportToExcel(exportData, filename, activeTab === "KELUARAN" ? "PPN_Keluaran" : "PPN_Masukan");
  };

  return (
    <div className="max-w-[95%] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 px-1">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 px-1">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-3">
            <FileCheck2 className="h-8 w-8 text-primary" />
            <span>Modul Perpajakan (PPN)</span>
          </h1>
          <p className="text-slate-500 font-bold text-[10px] md:text-sm uppercase tracking-widest opacity-70 mt-1">
            Rekapitulasi Faktur e-Faktur & XML Coretax
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Quick Month/Year Select */}
          <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-full sm:w-auto">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-4 py-2.5 bg-slate-50 border-0 rounded-xl text-xs font-black uppercase tracking-widest focus:outline-none cursor-pointer"
            >
              {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-4 py-2.5 bg-slate-50 border-0 rounded-xl text-xs font-black uppercase tracking-widest focus:outline-none ml-2 cursor-pointer"
            >
              {[2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Precise Date Range Picker */}
          <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 px-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={startDateStr}
                onChange={(e) => setStartDateStr(e.target.value)}
                className="bg-transparent border-0 text-xs font-black focus:outline-none cursor-pointer text-slate-700"
              />
            </div>
            <span className="text-slate-300 font-bold text-xs">s/d</span>
            <div className="flex items-center gap-1.5 px-2">
              <input
                type="date"
                value={endDateStr}
                onChange={(e) => setEndDateStr(e.target.value)}
                className="bg-transparent border-0 text-xs font-black focus:outline-none cursor-pointer text-slate-700"
              />
            </div>
          </div>

          <button 
            onClick={loadTaxData}
            className="p-3 bg-white border border-slate-200 rounded-2xl hover:border-primary hover:text-primary transition-all shadow-sm group"
            title="Refresh Data"
          >
            <RefreshCw className="h-5 w-5 text-slate-400 group-hover:rotate-180 transition-all duration-700 group-hover:text-primary" />
          </button>

          {activeTab === "KELUARAN" && (
            <button
              onClick={handleDownloadCoretax}
              className="bg-primary text-white pl-4 pr-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 flex items-center gap-2 text-xs uppercase tracking-widest"
            >
              <Download className="h-4 w-4" />
              <span>Ekspor XML Coretax</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: PPN Keluaran */}
        <div className="bg-white/80 border border-slate-200/60 rounded-[2rem] p-6 relative overflow-hidden group shadow-sm">
          <div className="absolute -right-12 -top-12 h-44 w-44 bg-indigo-50 rounded-full blur-3xl transition-transform group-hover:scale-110 opacity-60" />
          <div className="relative z-10 flex justify-between items-start">
            <div className="space-y-3">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full text-[9px] font-black uppercase tracking-widest">
                PPN Keluaran (Penjualan)
              </span>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                Rp {totalKeluaran.toLocaleString("id-ID")}
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                DPP Bersih: Rp {dppKeluaran.toLocaleString("id-ID")}
              </p>
            </div>
            <div className="bg-indigo-600 text-white p-3.5 rounded-2xl shadow-xl shadow-indigo-100">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Card 2: PPN Masukan */}
        <div className="bg-white/80 border border-slate-200/60 rounded-[2rem] p-6 relative overflow-hidden group shadow-sm">
          <div className="absolute -right-12 -top-12 h-44 w-44 bg-emerald-50 rounded-full blur-3xl transition-transform group-hover:scale-110 opacity-60" />
          <div className="relative z-10 flex justify-between items-start">
            <div className="space-y-3">
              <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[9px] font-black uppercase tracking-widest">
                PPN Masukan (Pembelian)
              </span>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                Rp {totalMasukan.toLocaleString("id-ID")}
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                DPP Bersih: Rp {dppMasukan.toLocaleString("id-ID")}
              </p>
            </div>
            <div className="bg-emerald-600 text-white p-3.5 rounded-2xl shadow-xl shadow-emerald-100">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Card 3: Selisih PPN */}
        <div className="bg-white/80 border border-slate-200/60 rounded-[2rem] p-6 relative overflow-hidden group shadow-sm">
          <div className={`absolute -right-12 -top-12 h-44 w-44 rounded-full blur-3xl transition-transform group-hover:scale-110 opacity-60 ${netPPN >= 0 ? "bg-rose-50" : "bg-emerald-50"}`} />
          <div className="relative z-10 flex justify-between items-start">
            <div className="space-y-3">
              <span className={`px-3 py-1 border rounded-full text-[9px] font-black uppercase tracking-widest ${
                netPPN >= 0 
                  ? "bg-rose-50 border-rose-100 text-rose-600" 
                  : "bg-emerald-50 border-emerald-100 text-emerald-600"
              }`}>
                Selisih PPN ({netPPN >= 0 ? "Kurang Bayar" : "Lebih Bayar"})
              </span>
              <h2 className={`text-2xl font-black tracking-tight ${netPPN >= 0 ? "text-rose-600" : "text-emerald-600"}`}>
                Rp {Math.abs(netPPN).toLocaleString("id-ID")}
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Status SPT Masa Pajak
              </p>
            </div>
            <div className={`text-white p-3.5 rounded-2xl shadow-xl ${netPPN >= 0 ? "bg-rose-600 shadow-rose-100" : "bg-emerald-600 shadow-emerald-100"}`}>
              <ArrowRightLeft className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid and Table */}
      <div className="bg-white border border-slate-200/80 rounded-[2.5rem] overflow-hidden shadow-sm">
        {/* Table Toolbar */}
        <div className="p-6 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white">
          {/* Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/60 w-full md:w-auto">
            <button
              onClick={() => { setActiveTab("KELUARAN"); setSearchTerm(""); }}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === "KELUARAN" 
                  ? "bg-white text-indigo-600 shadow-md" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              PPN Keluaran (Jual)
            </button>
            <button
              onClick={() => { setActiveTab("MASUKAN"); setSearchTerm(""); }}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === "MASUKAN" 
                  ? "bg-white text-emerald-600 shadow-md" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              PPN Masukan (Beli)
            </button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative w-full md:w-72 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={activeTab === "KELUARAN" ? "Cari No. SJ / Buyer / Faktur..." : "Cari No. LPB / Supplier / Faktur..."}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:border-primary focus:bg-white transition-all focus:ring-4 focus:ring-primary/5"
              />
            </div>
            
            {/* Export Excel Button */}
            <button
              onClick={handleExportExcel}
              className="p-3 bg-white border border-slate-200 rounded-2xl hover:border-emerald-500 hover:text-emerald-500 transition-all shadow-sm group"
              title="Ekspor Excel"
            >
              <Download className="h-5 w-5 text-slate-400 group-hover:text-emerald-500" />
            </button>
          </div>
        </div>

        {/* Table Render */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-24 text-center font-bold text-slate-400 animate-pulse italic">
              Sedang memuat data perpajakan...
            </div>
          ) : (activeTab === "KELUARAN" ? filteredKeluaran : filteredMasukan).length === 0 ? (
            <div className="py-24 text-center font-bold text-slate-400 italic">
              Tidak ada data transaksi kena pajak ditemukan untuk periode ini.
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-8 py-5 text-[9px] font-black uppercase tracking-wider text-slate-400 w-16">No</th>
                  <th className="px-8 py-5 text-[9px] font-black uppercase tracking-wider text-slate-400 w-36">Tanggal</th>
                  <th className="px-8 py-5 text-[9px] font-black uppercase tracking-wider text-slate-400 w-48">No. Dokumen</th>
                  <th className="px-8 py-5 text-[9px] font-black uppercase tracking-wider text-slate-400">Pihak Kedua</th>
                  <th className="px-8 py-5 text-[9px] font-black uppercase tracking-wider text-slate-400 text-right w-44">DPP (Bersih)</th>
                  <th className="px-8 py-5 text-[9px] font-black uppercase tracking-wider text-slate-400 text-right w-36">PPN (11%)</th>
                  <th className="px-8 py-5 text-[9px] font-black uppercase tracking-wider text-slate-400 w-64">Nomor Faktur Pajak (NSFP)</th>
                  <th className="px-8 py-5 text-[9px] font-black uppercase tracking-wider text-slate-400 text-center w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(activeTab === "KELUARAN" ? filteredKeluaran : filteredMasukan).map((item, idx) => {
                  const isKeluaran = activeTab === "KELUARAN";
                  const docDate = item.date || item.createdAt;
                  
                  return (
                    <tr key={item.id} className="group hover:bg-slate-50/30 transition-colors">
                      <td className="px-8 py-5 text-xs font-bold text-slate-400">{idx + 1}</td>
                      <td className="px-8 py-5 text-xs font-bold text-slate-500">
                        {format(new Date(docDate), "dd MMM yyyy")}
                      </td>
                      <td className="px-8 py-5 font-mono text-xs font-black text-primary uppercase">
                        <div>{isKeluaran ? item.deliveryNumber : item.receiptNumber}</div>
                        {isKeluaran && item.invoiceNumber && (
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">
                            {item.invoiceNumber}
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-5">
                        <div className="font-black text-slate-800 text-xs">
                          {isKeluaran ? item.buyerName : item.receivedFrom}
                        </div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tight mt-0.5 max-w-[250px] truncate">
                          {isKeluaran ? (item.recipient || "-") : "Pembelian Barang Supplier"}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right font-bold text-slate-700 text-xs">
                        Rp {Number(item.subtotal || 0).toLocaleString("id-ID")}
                      </td>
                      <td className={`px-8 py-5 text-right font-black text-xs ${isKeluaran ? "text-indigo-600" : "text-emerald-600"}`}>
                        Rp {Number(item.taxAmount || 0).toLocaleString("id-ID")}
                      </td>
                      <td className="px-8 py-5">
                        {item.taxInvoiceNumber ? (
                          <div className="space-y-1">
                            <div className="font-mono text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              {item.taxInvoiceNumber}
                            </div>
                            {item.taxInvoiceDate && (
                              <p className="text-[9px] text-slate-400 font-medium pl-3">
                                Tgl Faktur: {format(new Date(item.taxInvoiceDate), "dd/MM/yyyy")}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider italic bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-md">
                            Belum Dilaporkan (NSFP Kosong)
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-5 text-center">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-2 text-slate-400 hover:text-primary hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-xl transition-all"
                          title="Input Nomor Faktur Pajak"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* NSFP Input Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-10 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 border-2 border-white/20">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">
                  Input Nomor Faktur Pajak
                </h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Pencatatan Dokumen e-Faktur
                </p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Dokumen Transaksi:
              </span>
              <p className="font-mono text-sm font-black text-slate-800 mt-1 uppercase">
                {activeTab === "KELUARAN" ? editItem?.deliveryNumber : editItem?.receiptNumber}
              </p>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                {activeTab === "KELUARAN" ? editItem?.buyerName : editItem?.receivedFrom}
              </p>
            </div>

            <form onSubmit={handleSaveTaxInvoice} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                  Nomor Seri Faktur Pajak (NSFP)
                </label>
                <input
                  value={modalForm.taxInvoiceNumber}
                  onChange={e => setModalForm({ ...modalForm, taxInvoiceNumber: e.target.value })}
                  placeholder="Contoh: 010.026-26.12345678"
                  className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-4 rounded-2xl outline-none focus:border-primary font-mono font-bold text-slate-800 transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                  Tanggal Penerbitan Faktur Pajak
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 pointer-events-none" />
                  <input
                    type="date"
                    value={modalForm.taxInvoiceDate}
                    onChange={e => setModalForm({ ...modalForm, taxInvoiceDate: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-100 pl-12 pr-5 py-4 rounded-2xl outline-none focus:border-primary font-bold text-slate-800 transition-all"
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={saving}
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest mt-8 shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <span>Menyimpan...</span>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Simpan Faktur Pajak</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
