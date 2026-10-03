"use client";

import React, { useState, useEffect, useTransition } from "react";
import { format, addDays, subDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { 
    Calendar, Printer, Download, Plus, Trash2, Save, 
    Truck, ArrowLeft, RefreshCw, CheckCircle2, AlertCircle,
    Eye, Edit3, ShieldAlert, FileText, CheckSquare, Layers
} from "lucide-react";
import Link from "next/link";
import { callAction } from "@/proxy";
import * as XLSX from "xlsx";

interface ScheduleItem {
    id: string; // unique row id
    deliveryId?: string; // present if tied to salesDelivery
    deliveryNumber?: string;
    invoiceNumber?: string;
    taxType: "KB-TRN" | "KB-TRD";
    poNumber: string;
    buyerName: string;
    productName: string;
    quantity: number;
    driver: string;
    isManual?: boolean;
}

interface ShippingScheduleDashboardProps {
    initialDate: string;
    initialDeliveries: any[];
    currentUser: any;
}

const COMMON_DRIVERS = [
    "KUSWARA",
    "TIO",
    "MAMET",
    "KARIM",
    "HERU",
    "ROKHMAN",
    "EKSPEDISI",
    "TATANG",
    "KARNO",
    "RAHMAT",
    "IMAM",
    "YADI"
];

export function ShippingScheduleDashboard({
    initialDate,
    initialDeliveries,
    currentUser
}: ShippingScheduleDashboardProps) {
    const [selectedDate, setSelectedDate] = useState<string>(initialDate);
    const [deliveries, setDeliveries] = useState<any[]>(initialDeliveries);
    const [items, setItems] = useState<ScheduleItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
    const [taxFilter, setTaxFilter] = useState<"ALL" | "KB-TRN" | "KB-TRD">("ALL");
    const [printDesign, setPrintDesign] = useState<"corporate" | "classic">("corporate");
    const [saveStatus, setSaveStatus] = useState<Record<string, "saving" | "saved" | "error">>({});
    const [isPending, startTransition] = useTransition();

    // Transform deliveries into flat schedule items
    const buildItemsFromDeliveries = (delivs: any[]): ScheduleItem[] => {
        const rows: ScheduleItem[] = [];
        delivs.forEach(d => {
            const po = d.poNumber || "";
            const buyer = d.buyerName || "";
            const driver = d.driver || "";
            const inv = d.invoiceNumber || "";
            const isTRN = inv.startsWith("KB-TRN") || Number(d.taxRate || 0) > 0;
            const taxType: "KB-TRN" | "KB-TRD" = isTRN ? "KB-TRN" : "KB-TRD";
            const delivItems = d.items || [];

            if (delivItems.length === 0) {
                rows.push({
                    id: `${d.id}-empty`,
                    deliveryId: d.id,
                    deliveryNumber: d.deliveryNumber,
                    invoiceNumber: inv,
                    taxType: taxType,
                    poNumber: po,
                    buyerName: buyer,
                    productName: "-",
                    quantity: 0,
                    driver: driver,
                    isManual: false
                });
            } else {
                delivItems.forEach((it: any, idx: number) => {
                    rows.push({
                        id: `${d.id}-${it.id || idx}`,
                        deliveryId: d.id,
                        deliveryNumber: d.deliveryNumber,
                        invoiceNumber: inv,
                        taxType: taxType,
                        poNumber: po,
                        buyerName: buyer,
                        productName: it.productName || "Item",
                        quantity: Number(it.quantity || 0),
                        driver: driver,
                        isManual: false
                    });
                });
            }
        });
        return rows;
    };

    // Initialize items on mount or delivery change
    useEffect(() => {
        setItems(buildItemsFromDeliveries(deliveries));
    }, [deliveries]);

    // Fetch deliveries when selectedDate changes
    const fetchSchedule = async (dateStr: string) => {
        setIsLoading(true);
        try {
            const res = await callAction("getDailyShippingSchedule", dateStr);
            if (Array.isArray(res)) {
                setDeliveries(res);
            }
        } catch (err) {
            console.error("Gagal memuat jadwal pengiriman:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDateChange = (newDate: string) => {
        setSelectedDate(newDate);
        fetchSchedule(newDate);
    };

    // Update driver for all items belonging to a delivery
    const handleDriverChange = async (deliveryId: string, newDriver: string) => {
        const upperDriver = newDriver.toUpperCase();
        setItems(prev => prev.map(item => 
            item.deliveryId === deliveryId ? { ...item, driver: upperDriver } : item
        ));

        setSaveStatus(prev => ({ ...prev, [deliveryId]: "saving" }));
        try {
            await callAction("updateDeliveryDriver", deliveryId, upperDriver);
            setSaveStatus(prev => ({ ...prev, [deliveryId]: "saved" }));
            setTimeout(() => {
                setSaveStatus(prev => {
                    const copy = { ...prev };
                    delete copy[deliveryId];
                    return copy;
                });
            }, 2500);
        } catch (err) {
            console.error("Gagal menyimpan driver:", err);
            setSaveStatus(prev => ({ ...prev, [deliveryId]: "error" }));
        }
    };

    // Update manual row
    const handleManualRowChange = (id: string, field: keyof ScheduleItem, value: any) => {
        setItems(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, [field]: value };
            }
            return item;
        }));
    };

    // Add manual row
    const handleAddManualRow = () => {
        const defaultTax = taxFilter === "KB-TRN" ? "KB-TRN" : "KB-TRD";
        const newRow: ScheduleItem = {
            id: `manual-${Date.now()}`,
            taxType: defaultTax,
            invoiceNumber: defaultTax === "KB-TRN" ? "KB-TRN (MANUAL)" : "KB-TRD (MANUAL)",
            poNumber: "",
            buyerName: "",
            productName: "",
            quantity: 1,
            driver: "",
            isManual: true
        };
        setItems(prev => [...prev, newRow]);
    };

    // Remove row
    const handleRemoveRow = (id: string) => {
        setItems(prev => prev.filter(i => i.id !== id));
    };

    // Filter items based on active tax filter
    const displayedItems = items.filter(item => {
        if (taxFilter === "ALL") return true;
        return item.taxType === taxFilter;
    });

    // Stats calculations
    const countTRN = new Set(items.filter(i => i.taxType === "KB-TRN").map(i => i.deliveryId || i.id)).size;
    const countTRD = new Set(items.filter(i => i.taxType === "KB-TRD").map(i => i.deliveryId || i.id)).size;
    
    const totalDeliveries = new Set(displayedItems.map(i => i.deliveryId).filter(Boolean)).size + 
                            displayedItems.filter(i => i.isManual).length;
    const totalQty = displayedItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
    const assignedDrivers = Array.from(new Set(displayedItems.map(i => i.driver?.trim()).filter(Boolean)));

    // Date formatted for header: "PENGIRIMAN TANGGAL 03 OKTOBER 2026"
    const parsedDate = new Date(selectedDate);
    const dateFormattedIndo = !isNaN(parsedDate.getTime()) 
        ? format(parsedDate, "dd MMMM yyyy", { locale: localeId }).toUpperCase() 
        : selectedDate;
    
    const filterSuffix = taxFilter === "KB-TRN" 
        ? " • FAKTUR KB-TRN (PKP)" 
        : taxFilter === "KB-TRD" 
            ? " • FAKTUR KB-TRD (NON-PKP)" 
            : "";
    const headerTitle = `PENGIRIMAN TANGGAL ${dateFormattedIndo}${filterSuffix}`;

    // Export to Excel matching the exact format
    const handleExportExcel = () => {
        if (displayedItems.length === 0) {
            alert("Tidak ada data pengiriman untuk diekspor!");
            return;
        }

        const excelRows: any[][] = [];

        // Row 1: Merged Title
        excelRows.push([headerTitle, "", "", "", "", ""]);
        // Row 2: Headers
        excelRows.push(["NO. FAKTUR", "NO. PO", "BUYER", "PRODUK", "QTY", "DRIVER"]);

        let lastDelivId: string | null = null;

        displayedItems.forEach(item => {
            const isFirstOfDeliv = item.isManual || item.deliveryId !== lastDelivId;
            if (!item.isManual && item.deliveryId) {
                lastDelivId = item.deliveryId;
            }

            excelRows.push([
                isFirstOfDeliv ? (item.invoiceNumber || item.taxType) : "",
                isFirstOfDeliv ? (item.poNumber || "") : "",
                isFirstOfDeliv ? (item.buyerName || "") : "",
                item.productName || "",
                Number(item.quantity) || 0,
                isFirstOfDeliv ? (item.driver || "") : ""
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(excelRows);

        // Merge title across A1:F1
        ws["!merges"] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }
        ];

        ws["!cols"] = [
            { wch: 22 }, // FAKTUR
            { wch: 18 }, // PO
            { wch: 26 }, // BUYER
            { wch: 38 }, // PRODUK
            { wch: 12 }, // QTY
            { wch: 18 }  // DRIVER
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Pengiriman");

        const categoryTag = taxFilter !== "ALL" ? `_${taxFilter}` : "";
        const fileName = `PENGIRIMAN_${selectedDate.replace(/-/g, "")}${categoryTag}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            {/* Print Styles: High-Definition Corporate Print View */}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    @page { 
                        size: A4 portrait; 
                        margin: 8mm 8mm 10mm 8mm; 
                    }
                    body { 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important;
                        background: #ffffff !important;
                    }
                    .no-print { 
                        display: none !important; 
                    }
                    .print-table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        font-family: 'Segoe UI', Arial, sans-serif !important;
                        font-size: 10.5px !important;
                        color: #000000 !important;
                    }
                    .print-table th, .print-table td {
                        border: 1px solid #1e293b !important;
                        padding: 4px 6px !important;
                    }
                    .header-yellow {
                        background-color: #FFFF00 !important;
                        color: #000000 !important;
                        font-weight: bold !important;
                        text-align: center !important;
                    }
                    .header-corporate {
                        background-color: #0f172a !important;
                        color: #ffffff !important;
                        font-weight: bold !important;
                    }
                    .delivery-separator {
                        border-top: 2px solid #000000 !important;
                    }
                    .avoid-break {
                        page-break-inside: avoid !important;
                    }
                }
                .sheet-table {
                    border-collapse: collapse;
                    font-family: Arial, Helvetica, sans-serif;
                }
                .sheet-table th, .sheet-table td {
                    border: 1px solid #000000;
                }
                .header-yellow {
                    background-color: #FFFF00;
                    color: #000000;
                }
            `}} />

            {/* Datalist for driver autocomplete */}
            <datalist id="driver-suggestions">
                {COMMON_DRIVERS.map(drv => (
                    <option key={drv} value={drv} />
                ))}
            </datalist>

            {/* Top Toolbar (No-Print) */}
            <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/warehouse"
                            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all"
                            title="Kembali ke Modul Gudang"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                                    LOGISTIK GUDANG
                                </span>
                                <h1 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
                                    Jadwal & Rekap Pengiriman Harian
                                </h1>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">
                                Pengelompokan Faktur <span className="font-bold text-blue-600">KB-TRN (PKP)</span> / <span className="font-bold text-emerald-600">KB-TRD (NON-PKP)</span> & Penugasan Driver.
                            </p>
                        </div>
                    </div>

                    {/* Date Navigation & Controls */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Date Picker */}
                        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <button
                                onClick={() => handleDateChange(format(subDays(new Date(selectedDate), 1), "yyyy-MM-dd"))}
                                className="px-2 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white transition-all"
                                title="Hari Sebelumnya"
                            >
                                ‹ H-1
                            </button>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => handleDateChange(e.target.value)}
                                className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-800 outline-none cursor-pointer shadow-xs"
                            />
                            <button
                                onClick={() => handleDateChange(format(addDays(new Date(selectedDate), 1), "yyyy-MM-dd"))}
                                className="px-2 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white transition-all"
                                title="Hari Berikutnya"
                            >
                                H+1 ›
                            </button>
                            <button
                                onClick={() => handleDateChange(format(new Date(), "yyyy-MM-dd"))}
                                className="ml-1 px-2.5 py-1 text-xs font-black text-amber-700 bg-amber-100/80 hover:bg-amber-200 rounded-lg transition-all"
                            >
                                Hari Ini
                            </button>
                        </div>

                        {/* View Mode Toggle */}
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <button
                                onClick={() => setViewMode("edit")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    viewMode === "edit"
                                        ? "bg-white text-slate-900 shadow-xs"
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                <Edit3 className="h-3.5 w-3.5" />
                                <span>Input Driver</span>
                            </button>
                            <button
                                onClick={() => setViewMode("preview")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    viewMode === "preview"
                                        ? "bg-slate-900 text-white shadow-xs"
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                <Eye className="h-3.5 w-3.5" />
                                <span>Preview Cetak</span>
                            </button>
                        </div>

                        {/* Action Buttons */}
                        <button
                            onClick={handleExportExcel}
                            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs"
                        >
                            <Download className="h-4 w-4" />
                            <span>Excel</span>
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs"
                        >
                            <Printer className="h-4 w-4" />
                            <span>Cetak</span>
                        </button>
                    </div>
                </div>

                {/* Sub-Bar: KB-TRN vs KB-TRD Categorization Tabs */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Kategori Faktur:</span>
                        <div className="flex bg-white p-0.5 rounded-xl border border-slate-200 shadow-2xs">
                            <button
                                onClick={() => setTaxFilter("ALL")}
                                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                                    taxFilter === "ALL"
                                        ? "bg-slate-900 text-white shadow-xs"
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                <span>SEMUA PENGIRIMAN</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                                    taxFilter === "ALL" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                                }`}>
                                    {items.length}
                                </span>
                            </button>
                            <button
                                onClick={() => setTaxFilter("KB-TRN")}
                                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                                    taxFilter === "KB-TRN"
                                        ? "bg-blue-600 text-white shadow-xs"
                                        : "text-blue-700 hover:bg-blue-50"
                                }`}
                            >
                                <span className="h-2 w-2 rounded-full bg-blue-400 inline-block" />
                                <span>KB-TRN (PKP)</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                                    taxFilter === "KB-TRN" ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"
                                }`}>
                                    {countTRN} SJ
                                </span>
                            </button>
                            <button
                                onClick={() => setTaxFilter("KB-TRD")}
                                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                                    taxFilter === "KB-TRD"
                                        ? "bg-emerald-600 text-white shadow-xs"
                                        : "text-emerald-700 hover:bg-emerald-50"
                                }`}
                            >
                                <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" />
                                <span>KB-TRD (NON-PKP)</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                                    taxFilter === "KB-TRD" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700"
                                }`}>
                                    {countTRD} SJ
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Print Style Selector in Preview Mode */}
                    {viewMode === "preview" && (
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black uppercase text-slate-400">Gaya Dokumen:</span>
                            <div className="flex bg-white p-0.5 rounded-xl border border-slate-200">
                                <button
                                    onClick={() => setPrintDesign("corporate")}
                                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                                        printDesign === "corporate"
                                            ? "bg-slate-800 text-white"
                                            : "text-slate-600 hover:text-slate-900"
                                    }`}
                                >
                                    ★ Desain Profesional (Resmi)
                                </button>
                                <button
                                    onClick={() => setPrintDesign("classic")}
                                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                                        printDesign === "classic"
                                            ? "bg-amber-400 text-slate-950 font-black"
                                            : "text-slate-600 hover:text-slate-900"
                                    }`}
                                >
                                    Desain Kuning (Excel)
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Stats Bar (No-Print) */}
                <div className="no-print grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                            Pengiriman / SJ ({taxFilter})
                        </span>
                        <div className="text-xl font-black text-slate-800 mt-1">{totalDeliveries}</div>
                        <span className="text-[11px] text-slate-500 font-medium">Surat jalan aktif</span>
                    </div>
                    <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                            Total Muatan Barang
                        </span>
                        <div className="text-xl font-black text-blue-600 mt-1">{totalQty.toLocaleString("id-ID")} Unit</div>
                        <span className="text-[11px] text-slate-500 font-medium">{displayedItems.length} baris item barang</span>
                    </div>
                    <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                            Driver Ditugaskan
                        </span>
                        <div className="text-xl font-black text-amber-600 mt-1">{assignedDrivers.length} Orang</div>
                        <span className="text-[11px] text-slate-500 font-medium">
                            {assignedDrivers.length > 0 ? assignedDrivers.slice(0, 3).join(", ") + (assignedDrivers.length > 3 ? "..." : "") : "Belum diatur"}
                        </span>
                    </div>
                    <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Klasifikasi Pajak</span>
                            <div className="text-xs font-bold text-slate-800 mt-1 space-y-0.5">
                                <div className="text-blue-600 font-black">KB-TRN (PKP): {countTRN} SJ</div>
                                <div className="text-emerald-600 font-black">KB-TRD (Non-PKP): {countTRD} SJ</div>
                            </div>
                        </div>
                        <button
                            onClick={() => fetchSchedule(selectedDate)}
                            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all"
                            title="Refresh Data"
                        >
                            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                        </button>
                    </div>
                </div>

                {/* EDIT MODE: Interactive Table for Admin Gudang */}
                {viewMode === "edit" && (
                    <div className="no-print bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-8">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                                        Penetapan Driver & Input Pengiriman Harian
                                    </h3>
                                    {taxFilter !== "ALL" && (
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                                            taxFilter === "KB-TRN" ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"
                                        }`}>
                                            Filter: {taxFilter}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Ketik nama Driver pada kolom di bawah. Perubahan otomatis tersimpan ke Surat Jalan sistem.
                                </p>
                            </div>
                            <button
                                onClick={handleAddManualRow}
                                className="flex items-center gap-1.5 bg-slate-900 hover:bg-black text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Tambah Baris Manual</span>
                            </button>
                        </div>

                        {displayedItems.length === 0 ? (
                            <div className="text-center py-16 px-4">
                                <Truck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                                <h4 className="text-base font-bold text-slate-700">
                                    Tidak ada pengiriman {taxFilter !== "ALL" ? `kategori ${taxFilter}` : ""} untuk tanggal ini
                                </h4>
                                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                                    Belum ada Surat Jalan (Sales Delivery) pada tanggal {format(new Date(selectedDate), "dd MMMM yyyy")}. Anda dapat menambahkan baris pengiriman manual di atas.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black uppercase tracking-wider text-[11px]">
                                            <th className="py-3 px-3 w-10 text-center">NO</th>
                                            <th className="py-3 px-3 w-32">FAKTUR / TIPE</th>
                                            <th className="py-3 px-3 w-32">NO. PO</th>
                                            <th className="py-3 px-4 w-44">BUYER / CUSTOMER</th>
                                            <th className="py-3 px-4">NAMA PRODUK</th>
                                            <th className="py-3 px-3 w-20 text-right">QTY</th>
                                            <th className="py-3 px-4 w-48">DRIVER / SOPIR</th>
                                            <th className="py-3 px-3 w-14 text-center">AKSI</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {displayedItems.map((item, index) => {
                                            const isDelivSaved = item.deliveryId && saveStatus[item.deliveryId] === "saved";
                                            const isDelivSaving = item.deliveryId && saveStatus[item.deliveryId] === "saving";

                                            return (
                                                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="py-2.5 px-3 text-center text-slate-400 font-bold">
                                                        {index + 1}
                                                    </td>
                                                    <td className="py-2.5 px-3">
                                                        {item.isManual ? (
                                                            <select
                                                                value={item.taxType}
                                                                onChange={(e) => handleManualRowChange(item.id, "taxType", e.target.value)}
                                                                className="bg-slate-50 border border-slate-200 px-2 py-1 rounded text-xs font-bold text-slate-800 outline-none"
                                                            >
                                                                <option value="KB-TRN">KB-TRN (PKP)</option>
                                                                <option value="KB-TRD">KB-TRD (NON-PKP)</option>
                                                            </select>
                                                        ) : (
                                                            <div className="flex flex-col">
                                                                <span className={`inline-flex items-center gap-1 font-black text-[10px] px-1.5 py-0.5 rounded w-fit ${
                                                                    item.taxType === "KB-TRN"
                                                                        ? "bg-blue-100 text-blue-800"
                                                                        : "bg-emerald-100 text-emerald-800"
                                                                }`}>
                                                                    {item.taxType}
                                                                </span>
                                                                <span className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-[120px]">
                                                                    {item.invoiceNumber || item.deliveryNumber}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 px-3">
                                                        {item.isManual ? (
                                                            <input
                                                                type="text"
                                                                value={item.poNumber}
                                                                onChange={(e) => handleManualRowChange(item.id, "poNumber", e.target.value)}
                                                                placeholder="No. PO"
                                                                className="w-full bg-slate-50 border border-slate-200 px-2 py-1 rounded text-xs font-bold text-slate-800"
                                                            />
                                                        ) : (
                                                            <span className="font-bold text-slate-800 uppercase tracking-tight">
                                                                {item.poNumber || "-"}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 px-4">
                                                        {item.isManual ? (
                                                            <input
                                                                type="text"
                                                                value={item.buyerName}
                                                                onChange={(e) => handleManualRowChange(item.id, "buyerName", e.target.value)}
                                                                placeholder="Nama Buyer"
                                                                className="w-full bg-slate-50 border border-slate-200 px-2 py-1 rounded text-xs font-bold text-slate-800"
                                                            />
                                                        ) : (
                                                            <span className="font-bold text-slate-900 uppercase">
                                                                {item.buyerName}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 px-4">
                                                        {item.isManual ? (
                                                            <input
                                                                type="text"
                                                                value={item.productName}
                                                                onChange={(e) => handleManualRowChange(item.id, "productName", e.target.value)}
                                                                placeholder="Nama Produk"
                                                                className="w-full bg-slate-50 border border-slate-200 px-2 py-1 rounded text-xs font-medium text-slate-800"
                                                            />
                                                        ) : (
                                                            <span className="text-slate-800 uppercase font-semibold">
                                                                {item.productName}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right">
                                                        {item.isManual ? (
                                                            <input
                                                                type="number"
                                                                value={item.quantity}
                                                                onChange={(e) => handleManualRowChange(item.id, "quantity", Number(e.target.value))}
                                                                className="w-16 text-right bg-slate-50 border border-slate-200 px-2 py-1 rounded text-xs font-black text-slate-900"
                                                            />
                                                        ) : (
                                                            <span className="font-black text-slate-900 tabular-nums">
                                                                {item.quantity.toLocaleString("id-ID")}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 px-4">
                                                        <div className="flex items-center gap-1.5">
                                                            <input
                                                                list="driver-suggestions"
                                                                type="text"
                                                                value={item.driver}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (item.isManual) {
                                                                        handleManualRowChange(item.id, "driver", val.toUpperCase());
                                                                    } else if (item.deliveryId) {
                                                                        handleDriverChange(item.deliveryId, val);
                                                                    }
                                                                }}
                                                                placeholder="PILIH DRIVER"
                                                                className="w-full bg-amber-50/70 hover:bg-amber-50 focus:bg-white border border-amber-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 px-2.5 py-1 rounded-lg text-xs font-black text-slate-900 uppercase transition-all"
                                                            />
                                                            {isDelivSaving && (
                                                                <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-500 flex-shrink-0" />
                                                            )}
                                                            {isDelivSaved && (
                                                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center">
                                                        {item.isManual && (
                                                            <button
                                                                onClick={() => handleRemoveRow(item.id)}
                                                                className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                                                title="Hapus baris manual"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* PREVIEW & PRINT READY VIEW */}
                <div className={`bg-white border border-slate-300 rounded-xl shadow-lg p-6 sm:p-10 mx-auto max-w-[210mm] ${viewMode === "edit" ? "hidden print:block" : "block"}`}>
                    
                    {/* OPTION 1: CORPORATE PROFESSIONAL PRINT DESIGN */}
                    {printDesign === "corporate" && (
                        <div className="space-y-6">
                            {/* Official Company Header */}
                            <div className="border-b-2 border-slate-900 pb-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-lg sm:text-xl font-black text-slate-950 uppercase tracking-tight">
                                            PT. KOLA BORASI INDONESIA
                                        </h2>
                                        <p className="text-[10px] text-slate-600 font-semibold tracking-wider uppercase mt-0.5">
                                            Logistik & Manajemen Pergudangan Distribusi Terpadu
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`inline-block px-3 py-1 rounded text-xs font-black uppercase tracking-wider ${
                                            taxFilter === "KB-TRN"
                                                ? "bg-blue-900 text-white"
                                                : taxFilter === "KB-TRD"
                                                    ? "bg-emerald-900 text-white"
                                                    : "bg-slate-900 text-white"
                                        }`}>
                                            {taxFilter === "KB-TRN" ? "PENGIRIMAN FAKTUR KB-TRN (PKP)" : taxFilter === "KB-TRD" ? "PENGIRIMAN FAKTUR KB-TRD (NON-PKP)" : "PENGIRIMAN GABUNGAN (KB-TRN & KB-TRD)"}
                                        </span>
                                        <p className="text-[10px] font-mono text-slate-500 mt-1">
                                            TANGGAL: {dateFormattedIndo}
                                        </p>
                                    </div>
                                </div>

                                <div className="text-center mt-3 pt-2 border-t border-slate-200">
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                                        JADWAL & REKAP PENGIRIMAN BARANG
                                    </h3>
                                </div>
                            </div>

                            {/* Summary Metadata Box */}
                            <div className="grid grid-cols-4 gap-2 text-[10px] bg-slate-50 p-2.5 rounded border border-slate-300">
                                <div>
                                    <span className="text-slate-500 block uppercase font-bold">Hari & Tanggal:</span>
                                    <span className="font-black text-slate-900 uppercase">{dateFormattedIndo}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block uppercase font-bold">Kategori Faktur:</span>
                                    <span className="font-black text-slate-900 uppercase">{taxFilter}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block uppercase font-bold">Total Pengiriman:</span>
                                    <span className="font-black text-slate-900">{totalDeliveries} Surat Jalan</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block uppercase font-bold">Total Muatan:</span>
                                    <span className="font-black text-slate-900">{totalQty.toLocaleString("id-ID")} Unit</span>
                                </div>
                            </div>

                            {/* Professional Table */}
                            <table className="w-full print-table border-collapse text-black text-[10.5px]">
                                <thead>
                                    <tr className="bg-slate-900 text-white text-[10px] font-black uppercase">
                                        <th className="border border-slate-800 py-2 px-1 w-7 text-center">NO</th>
                                        <th className="border border-slate-800 py-2 px-2 w-28 text-center">NO. FAKTUR</th>
                                        <th className="border border-slate-800 py-2 px-2 w-24 text-center">NO. PO</th>
                                        <th className="border border-slate-800 py-2 px-2.5 w-36 text-center">BUYER / CUSTOMER</th>
                                        <th className="border border-slate-800 py-2 px-3 text-center">NAMA PRODUK</th>
                                        <th className="border border-slate-800 py-2 px-2 w-14 text-center">QTY</th>
                                        <th className="border border-slate-800 py-2 px-2.5 w-24 text-center">DRIVER</th>
                                        <th className="border border-slate-800 py-2 px-1.5 w-12 text-center">CEK</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        let lastDelivId: string | null = null;
                                        let deliveryIndex = 0;

                                        return displayedItems.map((item, idx) => {
                                            const isFirstOfDeliv = item.isManual || item.deliveryId !== lastDelivId;
                                            if (isFirstOfDeliv) {
                                                deliveryIndex++;
                                            }
                                            if (!item.isManual && item.deliveryId) {
                                                lastDelivId = item.deliveryId;
                                            }

                                            return (
                                                <tr 
                                                    key={idx} 
                                                    className={`${isFirstOfDeliv && idx !== 0 ? "delivery-separator border-t-2 border-slate-800" : ""}`}
                                                >
                                                    {/* NO: displayed on first row of delivery */}
                                                    <td className="border border-slate-400 py-1 px-1 text-center font-bold text-[10px]">
                                                        {isFirstOfDeliv ? deliveryIndex : ""}
                                                    </td>

                                                    {/* FAKTUR: displayed on first row */}
                                                    <td className="border border-slate-400 py-1 px-1.5 font-bold text-[9.5px] uppercase whitespace-nowrap">
                                                        {isFirstOfDeliv ? (
                                                            <div>
                                                                <span className="block font-black">{item.invoiceNumber || item.taxType}</span>
                                                                <span className="text-[8.5px] text-slate-500 font-mono">{item.deliveryNumber}</span>
                                                            </div>
                                                        ) : ""}
                                                    </td>

                                                    {/* PO: displayed on first row */}
                                                    <td className="border border-slate-400 py-1 px-1.5 font-semibold uppercase text-[9.5px]">
                                                        {isFirstOfDeliv ? (item.poNumber || "-") : ""}
                                                    </td>

                                                    {/* BUYER: displayed on first row */}
                                                    <td className="border border-slate-400 py-1 px-2 font-bold uppercase text-[10px]">
                                                        {isFirstOfDeliv ? item.buyerName : ""}
                                                    </td>

                                                    {/* PRODUK: each item gets its own line */}
                                                    <td className="border border-slate-400 py-1 px-2 uppercase font-medium text-[10px]">
                                                        {item.productName}
                                                    </td>

                                                    {/* QTY: bold and right/center */}
                                                    <td className="border border-slate-400 py-1 px-1 text-center font-black text-[10.5px]">
                                                        {Number(item.quantity) > 0 ? Number(item.quantity).toLocaleString("id-ID") : ""}
                                                    </td>

                                                    {/* DRIVER: displayed on first row */}
                                                    <td className="border border-slate-400 py-1 px-1.5 text-center font-black uppercase text-[10px] whitespace-nowrap">
                                                        {isFirstOfDeliv ? item.driver : ""}
                                                    </td>

                                                    {/* CEK FISIK GUDANG (Checkmark box) */}
                                                    <td className="border border-slate-400 py-1 px-1 text-center">
                                                        <div className="w-3.5 h-3.5 border border-slate-600 mx-auto rounded-xs" />
                                                    </td>
                                                </tr>
                                            );
                                        });
                                    })()}
                                </tbody>
                            </table>

                            {/* Signatures & Official Approvals Footer */}
                            <div className="avoid-break pt-4 mt-6 border-t border-slate-300">
                                <div className="grid grid-cols-3 gap-6 text-center text-xs">
                                    <div className="flex flex-col justify-between h-28 border border-slate-200 p-2 rounded">
                                        <span className="text-[10px] font-black uppercase text-slate-600">Disiapkan / Checker</span>
                                        <div className="border-b border-slate-400 w-3/4 mx-auto pb-1">
                                            ( ............................................ )
                                        </div>
                                        <span className="text-[9px] text-slate-400">Staff Gudang</span>
                                    </div>
                                    <div className="flex flex-col justify-between h-28 border border-slate-200 p-2 rounded">
                                        <span className="text-[10px] font-black uppercase text-slate-600">Dibawa Oleh / Driver</span>
                                        <div className="border-b border-slate-400 w-3/4 mx-auto pb-1">
                                            ( ............................................ )
                                        </div>
                                        <span className="text-[9px] text-slate-400">Sopir / Ekspedisi</span>
                                    </div>
                                    <div className="flex flex-col justify-between h-28 border border-slate-200 p-2 rounded">
                                        <span className="text-[10px] font-black uppercase text-slate-600">Mengetahui / Penanggung Jawab</span>
                                        <div className="border-b border-slate-400 w-3/4 mx-auto pb-1">
                                            ( ............................................ )
                                        </div>
                                        <span className="text-[9px] text-slate-400">Kepala Gudang / Admin</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center text-[8.5px] text-slate-400 mt-4 px-1">
                                    <span>Catatan: Pastikan seluruh fisik barang telah dihitung bersama driver sebelum keluar gudang.</span>
                                    <span>Dicetak pada: {format(new Date(), "dd/MM/yyyy HH:mm")} WIB • ERP System</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* OPTION 2: CLASSIC YELLOW SPREADSHEET DESIGN */}
                    {printDesign === "classic" && (
                        <table className="w-full sheet-table print-table mb-0 text-black">
                            <thead>
                                <tr>
                                    <th 
                                        colSpan={5} 
                                        className="header-yellow py-2 px-3 text-center text-sm sm:text-base font-black uppercase tracking-wider border border-black"
                                    >
                                        {headerTitle}
                                    </th>
                                </tr>
                                {/* Header Row */}
                                <tr className="header-yellow text-[11px] sm:text-xs font-black uppercase text-black">
                                    <th className="border border-black py-1.5 px-2 w-[16%] text-center">PO</th>
                                    <th className="border border-black py-1.5 px-3 w-[24%] text-center">BUYER</th>
                                    <th className="border border-black py-1.5 px-3 w-[38%] text-center">PRODUK</th>
                                    <th className="border border-black py-1.5 px-2 w-[10%] text-center">QTY</th>
                                    <th className="border border-black py-1.5 px-2 w-[12%] text-center">DRIVER</th>
                                </tr>
                            </thead>
                            <tbody className="text-[11px] leading-tight">
                                {(() => {
                                    let lastDelivId: string | null = null;
                                    
                                    return displayedItems.map((item, idx) => {
                                        const isFirstOfDeliv = item.isManual || item.deliveryId !== lastDelivId;
                                        if (!item.isManual && item.deliveryId) {
                                            lastDelivId = item.deliveryId;
                                        }

                                        return (
                                            <tr key={idx} className="h-6">
                                                {/* PO: displayed on first row of delivery */}
                                                <td className="border border-black py-1 px-2 font-semibold text-center uppercase whitespace-nowrap">
                                                    {isFirstOfDeliv ? item.poNumber : ""}
                                                </td>

                                                {/* BUYER: displayed on first row of delivery */}
                                                <td className="border border-black py-1 px-2.5 font-bold uppercase">
                                                    {isFirstOfDeliv ? item.buyerName : ""}
                                                </td>

                                                {/* PRODUK: each item gets its own line */}
                                                <td className="border border-black py-1 px-2.5 uppercase font-medium">
                                                    {item.productName}
                                                </td>

                                                {/* QTY: centered */}
                                                <td className="border border-black py-1 px-2 text-center font-bold">
                                                    {Number(item.quantity) > 0 ? Number(item.quantity).toLocaleString("id-ID") : ""}
                                                </td>

                                                {/* DRIVER: displayed on first row of delivery */}
                                                <td className="border border-black py-1 px-2 text-center font-bold uppercase whitespace-nowrap">
                                                    {isFirstOfDeliv ? item.driver : ""}
                                                </td>
                                            </tr>
                                        );
                                    });
                                })()}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>
        </div>
    );
}

export default ShippingScheduleDashboard;
