"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import { format, addDays, subDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { 
    Calendar, Printer, Download, Plus, Trash2, Save, 
    Truck, ArrowLeft, RefreshCw, CheckCircle2, AlertCircle,
    Eye, Edit3, ShieldAlert, FileText, CheckSquare, Square, Layers, X, UserCheck
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
    initialMappings?: any[];
    customerList?: string[];
    productList?: string[];
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
    initialMappings = [],
    customerList = [],
    productList = [],
    currentUser
}: ShippingScheduleDashboardProps) {
    const [selectedDate, setSelectedDate] = useState<string>(initialDate);
    const [deliveries, setDeliveries] = useState<any[]>(initialDeliveries);
    const [items, setItems] = useState<ScheduleItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isBatchSaving, setIsBatchSaving] = useState<boolean>(false);
    const [batchSaveMessage, setBatchSaveMessage] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
    const [taxFilter, setTaxFilter] = useState<"ALL" | "KB-TRN" | "KB-TRD">("ALL");
    const [printDesign, setPrintDesign] = useState<"corporate" | "classic">("corporate");
    const [saveStatus, setSaveStatus] = useState<Record<string, "saving" | "saved" | "error">>({});
    const [isPending, startTransition] = useTransition();

    // NEW: Fleet / Vehicle Batch Management States
    const [activeDriverTab, setActiveDriverTab] = useState<string>("ALL"); // "ALL" | "UNASSIGNED" | specific driver
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
    const [bulkDriver, setBulkDriver] = useState<string>("");
    const [customDrivers, setCustomDrivers] = useState<string[]>([]);
    const [newDriverInput, setNewDriverInput] = useState<string>("");
    const [showAddDriverModal, setShowAddDriverModal] = useState<boolean>(false);

    // NEW: Print Scope (Per Vehicle Manifest vs Daily Recap)
    const [printScope, setPrintScope] = useState<"VEHICLE_MANIFEST" | "DAILY_RECAP">("VEHICLE_MANIFEST");
    const [targetVehicle, setTargetVehicle] = useState<string>("ALL"); // "ALL" or specific driver

    // Helper to transform saved mappings into ScheduleItem format
    const buildItemsFromMappings = (maps: any[]): ScheduleItem[] => {
        return maps.map((m: any) => ({
            id: m.id,
            deliveryNumber: "",
            invoiceNumber: m.category === "KB-TRN" ? "KB-TRN (MAPPING)" : "KB-TRD (MAPPING)",
            taxType: (m.category === "KB-TRN" ? "KB-TRN" : "KB-TRD") as "KB-TRN" | "KB-TRD",
            poNumber: m.poNumber || "",
            buyerName: m.buyerName || "",
            productName: m.productName || "",
            quantity: Number(m.quantity || 0),
            driver: m.driver || "",
            isManual: true
        }));
    };

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
        if (initialMappings && initialMappings.length > 0) {
            setItems(buildItemsFromMappings(initialMappings));
        } else {
            setItems(buildItemsFromDeliveries(deliveries));
        }
    }, [deliveries]);

    // Fetch deliveries and mappings when selectedDate changes
    const fetchSchedule = async (dateStr: string) => {
        setIsLoading(true);
        try {
            const [delivRes, mapRes] = await Promise.all([
                callAction("getDailyShippingSchedule", dateStr),
                callAction("getShippingMappings", dateStr, "ALL")
            ]);
            if (Array.isArray(mapRes) && mapRes.length > 0) {
                setItems(buildItemsFromMappings(mapRes));
            } else if (Array.isArray(delivRes)) {
                setDeliveries(delivRes);
                setItems(buildItemsFromDeliveries(delivRes));
            } else {
                setItems([]);
            }
        } catch (err) {
            console.error("Gagal memuat jadwal pengiriman:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDateChange = (newDate: string) => {
        setSelectedDate(newDate);
        setSelectedItemIds(new Set());
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

    // Bulk assign driver to selected items
    const handleBulkAssignDriver = async (targetDriver: string) => {
        if (!targetDriver || selectedItemIds.size === 0) return;
        const upperDriver = targetDriver.toUpperCase();
        
        const selectedItems = items.filter(i => selectedItemIds.has(i.id));
        const delivIds = Array.from(new Set(selectedItems.map(i => i.deliveryId).filter(Boolean))) as string[];

        // Update local items state
        setItems(prev => prev.map(item => {
            if (selectedItemIds.has(item.id) || (item.deliveryId && delivIds.includes(item.deliveryId))) {
                return { ...item, driver: upperDriver };
            }
            return item;
        }));

        setSelectedItemIds(new Set());
        setBulkDriver("");

        // Save delivery driver assignments to database in parallel
        if (delivIds.length > 0) {
            await Promise.all(
                delivIds.map(dId => callAction("updateDeliveryDriver", dId, upperDriver).catch(console.error))
            );
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
        const defaultDriver = activeDriverTab !== "ALL" && activeDriverTab !== "UNASSIGNED" ? activeDriverTab : "";
        const newRow: ScheduleItem = {
            id: `manual-${Date.now()}`,
            taxType: defaultTax,
            invoiceNumber: defaultTax === "KB-TRN" ? "KB-TRN (MANUAL)" : "KB-TRD (MANUAL)",
            poNumber: "",
            buyerName: "",
            productName: "",
            quantity: 1,
            driver: defaultDriver,
            isManual: true
        };
        setItems(prev => [...prev, newRow]);
    };

    // Remove row
    const handleRemoveRow = (id: string) => {
        setItems(prev => prev.filter(i => i.id !== id));
        setSelectedItemIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    };

    // Save entire mapping to database for Admin Purchase reference
    const handleSaveBatchMapping = async () => {
        if (items.length === 0) return;
        setIsBatchSaving(true);
        setBatchSaveMessage(null);
        try {
            const trnRows = items.filter(i => i.taxType === "KB-TRN");
            const trdRows = items.filter(i => i.taxType === "KB-TRD");

            if (taxFilter === "KB-TRN" || taxFilter === "ALL") {
                await callAction("saveShippingMappingBatch", {
                    dateStr: selectedDate,
                    category: "KB-TRN",
                    rows: trnRows.map(r => ({
                        poNumber: r.poNumber,
                        buyerName: r.buyerName,
                        productName: r.productName,
                        quantity: Number(r.quantity || 0),
                        driver: r.driver
                    }))
                });
            }

            if (taxFilter === "KB-TRD" || taxFilter === "ALL") {
                await callAction("saveShippingMappingBatch", {
                    dateStr: selectedDate,
                    category: "KB-TRD",
                    rows: trdRows.map(r => ({
                        poNumber: r.poNumber,
                        buyerName: r.buyerName,
                        productName: r.productName,
                        quantity: Number(r.quantity || 0),
                        driver: r.driver
                    }))
                });
            }

            setBatchSaveMessage("Mapping pengiriman berhasil disimpan! Informasi acuan ini kini dapat langsung dibaca oleh Admin Purchase.");
            setTimeout(() => setBatchSaveMessage(null), 5000);
        } catch (err: any) {
            console.error("Gagal menyimpan mapping batch:", err);
            alert("Gagal menyimpan mapping: " + (err.message || String(err)));
        } finally {
            setIsBatchSaving(false);
        }
    };

    // Active drivers currently assigned in items
    const activeDrivers = useMemo(() => {
        const set = new Set<string>();
        items.forEach(i => {
            const d = (i.driver || "").trim().toUpperCase();
            if (d && d !== "PILIH DRIVER" && d !== "-") set.add(d);
        });
        customDrivers.forEach(d => set.add(d.trim().toUpperCase()));
        return Array.from(set).sort();
    }, [items, customDrivers]);

    // All driver options for suggestions and dropdowns
    const allDriverOptions = useMemo(() => {
        const set = new Set<string>(COMMON_DRIVERS);
        activeDrivers.forEach(d => set.add(d));
        return Array.from(set).sort();
    }, [activeDrivers]);

    // Stats breakdown per driver / vehicle
    const fleetBreakdown = useMemo(() => {
        const map = new Map<string, { countSJ: number; totalQty: number; itemsCount: number }>();
        let unassignedSJ = new Set<string>();
        let unassignedQty = 0;
        let unassignedItemsCount = 0;

        items.forEach(i => {
            // Respect taxFilter for breakdown
            if (taxFilter !== "ALL" && i.taxType !== taxFilter) return;

            const drv = (i.driver || "").trim().toUpperCase();
            const key = i.deliveryId || i.id;
            if (!drv || drv === "PILIH DRIVER" || drv === "-") {
                unassignedSJ.add(key);
                unassignedQty += Number(i.quantity || 0);
                unassignedItemsCount++;
            } else {
                if (!map.has(drv)) {
                    map.set(drv, { countSJ: 0, totalQty: 0, itemsCount: 0 });
                }
                const entry = map.get(drv)!;
                entry.totalQty += Number(i.quantity || 0);
                entry.itemsCount++;
            }
        });

        map.forEach((entry, drv) => {
            const drvItems = items.filter(i => {
                if (taxFilter !== "ALL" && i.taxType !== taxFilter) return false;
                return (i.driver || "").trim().toUpperCase() === drv;
            });
            entry.countSJ = new Set(drvItems.map(i => i.deliveryId || i.id)).size;
        });

        return {
            byDriver: map,
            unassigned: {
                countSJ: unassignedSJ.size,
                totalQty: unassignedQty,
                itemsCount: unassignedItemsCount
            }
        };
    }, [items, taxFilter]);

    // Filter items based on active tax filter AND active driver/vehicle tab
    const displayedItems = useMemo(() => {
        return items.filter(item => {
            if (taxFilter !== "ALL" && item.taxType !== taxFilter) return false;
            
            const drv = (item.driver || "").trim().toUpperCase();
            if (activeDriverTab === "ALL") return true;
            if (activeDriverTab === "UNASSIGNED") {
                return !drv || drv === "PILIH DRIVER" || drv === "-";
            }
            return drv === activeDriverTab.toUpperCase();
        });
    }, [items, taxFilter, activeDriverTab]);

    // Checkbox selection logic
    const isAllDisplayedSelected = displayedItems.length > 0 && displayedItems.every(i => selectedItemIds.has(i.id));

    const handleToggleSelectAll = () => {
        if (isAllDisplayedSelected) {
            setSelectedItemIds(prev => {
                const next = new Set(prev);
                displayedItems.forEach(i => next.delete(i.id));
                return next;
            });
        } else {
            setSelectedItemIds(prev => {
                const next = new Set(prev);
                displayedItems.forEach(i => next.add(i.id));
                return next;
            });
        }
    };

    const handleToggleSelectItem = (id: string, deliveryId?: string) => {
        setSelectedItemIds(prev => {
            const next = new Set(prev);
            if (deliveryId) {
                const siblingItems = displayedItems.filter(i => i.deliveryId === deliveryId);
                const isSelected = siblingItems.some(i => next.has(i.id));
                if (isSelected) {
                    siblingItems.forEach(i => next.delete(i.id));
                } else {
                    siblingItems.forEach(i => next.add(i.id));
                }
            } else {
                if (next.has(id)) next.delete(id);
                else next.add(id);
            }
            return next;
        });
    };

    // Stats calculations
    const countTRN = new Set(items.filter(i => i.taxType === "KB-TRN").map(i => i.deliveryId || i.id)).size;
    const countTRD = new Set(items.filter(i => i.taxType === "KB-TRD").map(i => i.deliveryId || i.id)).size;
    
    const totalDeliveries = new Set(displayedItems.map(i => i.deliveryId).filter(Boolean)).size + 
                            displayedItems.filter(i => i.isManual).length;
    const totalQty = displayedItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
    const assignedDrivers = Array.from(new Set(items.map(i => i.driver?.trim().toUpperCase()).filter(Boolean)));

    // Date formatted for header
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

    // Export to Excel
    const handleExportExcel = () => {
        if (displayedItems.length === 0) {
            alert("Tidak ada data pengiriman untuk diekspor!");
            return;
        }

        const excelRows: any[][] = [];
        excelRows.push([headerTitle, "", "", "", "", ""]);
        excelRows.push(["NO. FAKTUR", "NO. PO", "BUYER", "PRODUK", "QTY", "DRIVER / KENDARAAN"]);

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
        ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
        ws["!cols"] = [
            { wch: 22 }, { wch: 18 }, { wch: 26 }, { wch: 38 }, { wch: 12 }, { wch: 22 }
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Pengiriman");

        const categoryTag = taxFilter !== "ALL" ? `_${taxFilter}` : "";
        const driverTag = activeDriverTab !== "ALL" ? `_${activeDriverTab}` : "";
        const fileName = `PENGIRIMAN_${selectedDate.replace(/-/g, "")}${categoryTag}${driverTag}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    // Quick print specific vehicle
    const handleQuickPrintVehicle = (driverName: string) => {
        setPrintScope("VEHICLE_MANIFEST");
        setTargetVehicle(driverName);
        setViewMode("preview");
        setTimeout(() => window.print(), 300);
    };

    // Group items by driver for Vehicle Manifest output
    const itemsGroupedByDriver = useMemo(() => {
        const map = new Map<string, ScheduleItem[]>();
        displayedItems.forEach(item => {
            const drv = (item.driver || "").trim().toUpperCase() || "BELUM_DIATUR";
            if (!map.has(drv)) {
                map.set(drv, []);
            }
            map.get(drv)!.push(item);
        });
        return map;
    }, [displayedItems]);

    // Drivers to be rendered in preview/print
    const driversToRender = useMemo(() => {
        const allDrivers = Array.from(itemsGroupedByDriver.keys());
        if (targetVehicle === "ALL") return allDrivers;
        return allDrivers.filter(d => d === targetVehicle.toUpperCase());
    }, [itemsGroupedByDriver, targetVehicle]);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            {/* Print Styles: High-Definition Corporate Print View */}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    @page { 
                        size: A4 portrait; 
                        margin: 6mm 8mm 8mm 8mm; 
                    }
                    body { 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important;
                        background: #ffffff !important;
                    }
                    .no-print { 
                        display: none !important; 
                    }
                    .page-break-after {
                        page-break-after: always !important;
                        break-after: page !important;
                    }
                    .print-table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        font-family: 'Segoe UI', Arial, sans-serif !important;
                        font-size: 10px !important;
                        color: #000000 !important;
                    }
                    .print-table th, .print-table td {
                        border: 1px solid #1e293b !important;
                        padding: 3.5px 6px !important;
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

            {/* Datalists for autocomplete */}
            <datalist id="driver-suggestions">
                {allDriverOptions.map(drv => (
                    <option key={drv} value={drv} />
                ))}
            </datalist>
            <datalist id="customer-suggestions">
                {customerList.map((c, i) => (
                    <option key={i} value={c} />
                ))}
            </datalist>
            <datalist id="product-suggestions">
                {productList.map((p, i) => (
                    <option key={i} value={p} />
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
                                Penugasan Muatan Kendaraan & Cetak Form Manifest Masing-Masing Kendaraan.
                            </p>
                        </div>
                    </div>

                    {/* Date Navigation & Controls */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Date Picker */}
                        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <button
                                onClick={() => handleDateChange(format(subDays(new Date(selectedDate), 1), "yyyy-MM-dd"))}
                                className="px-2 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white transition-all cursor-pointer"
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
                                className="px-2 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white transition-all cursor-pointer"
                                title="Hari Berikutnya"
                            >
                                H+1 ›
                            </button>
                            <button
                                onClick={() => handleDateChange(format(new Date(), "yyyy-MM-dd"))}
                                className="ml-1 px-2.5 py-1 text-xs font-black text-amber-700 bg-amber-100/80 hover:bg-amber-200 rounded-lg transition-all cursor-pointer"
                            >
                                Hari Ini
                            </button>
                        </div>

                        {/* View Mode Toggle */}
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <button
                                onClick={() => setViewMode("edit")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    viewMode === "edit"
                                        ? "bg-white text-slate-900 shadow-xs"
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                <Edit3 className="h-3.5 w-3.5" />
                                <span>Input & Muat Kendaraan</span>
                            </button>
                            <button
                                onClick={() => setViewMode("preview")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    viewMode === "preview"
                                        ? "bg-slate-900 text-white shadow-xs"
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                <Eye className="h-3.5 w-3.5" />
                                <span>Preview Cetak Form</span>
                            </button>
                        </div>

                        {/* Action Buttons */}
                        <button
                            onClick={handleExportExcel}
                            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                            <Download className="h-4 w-4" />
                            <span>Excel</span>
                        </button>
                        <button
                            onClick={() => {
                                setViewMode("preview");
                                setTimeout(() => window.print(), 200);
                            }}
                            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                            <Printer className="h-4 w-4" />
                            <span>Cetak</span>
                        </button>
                    </div>
                </div>

                {/* Sub-Bar: Tax Filter & Vehicle Tabs */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
                    {/* Tax Category Filter */}
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Faktur:</span>
                        <div className="flex bg-white p-0.5 rounded-xl border border-slate-200 shadow-2xs">
                            <button
                                onClick={() => setTaxFilter("ALL")}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                                    taxFilter === "ALL" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                <span>SEMUA</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                                    taxFilter === "ALL" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                                }`}>
                                    {items.length}
                                </span>
                            </button>
                            <button
                                onClick={() => setTaxFilter("KB-TRN")}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                                    taxFilter === "KB-TRN" ? "bg-blue-600 text-white shadow-xs" : "text-blue-700 hover:bg-blue-50"
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
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                                    taxFilter === "KB-TRD" ? "bg-emerald-600 text-white shadow-xs" : "text-emerald-700 hover:bg-emerald-50"
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

                    {/* Preview Mode Controls */}
                    {viewMode === "preview" && (
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-black uppercase text-slate-400">Pilihan Cetak:</span>
                            <select
                                value={printScope}
                                onChange={(e) => setPrintScope(e.target.value as any)}
                                className="bg-white border border-slate-200 text-xs font-black text-slate-800 px-3 py-1 rounded-xl outline-none shadow-2xs cursor-pointer"
                            >
                                <option value="VEHICLE_MANIFEST">📑 Form per Kendaraan (1 Lembar per Mobil)</option>
                                <option value="DAILY_RECAP">📋 Rekap Gabungan Semua Sopir (Kantor)</option>
                            </select>

                            {printScope === "VEHICLE_MANIFEST" && (
                                <select
                                    value={targetVehicle}
                                    onChange={(e) => setTargetVehicle(e.target.value)}
                                    className="bg-white border border-slate-200 text-xs font-black text-indigo-700 px-3 py-1 rounded-xl outline-none shadow-2xs cursor-pointer"
                                >
                                    <option value="ALL">Cetak Semua Armada (Auto Page Break)</option>
                                    {activeDrivers.map(d => (
                                        <option key={d} value={d}>Khusus Mobil: {d}</option>
                                    ))}
                                </select>
                            )}

                            {/* Design Selector for Daily Recap */}
                            {printScope === "DAILY_RECAP" && (
                                <div className="flex bg-white p-0.5 rounded-xl border border-slate-200">
                                    <button
                                        onClick={() => setPrintDesign("corporate")}
                                        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                                            printDesign === "corporate" ? "bg-slate-800 text-white" : "text-slate-600 hover:text-slate-900"
                                        }`}
                                    >
                                        ★ Resmi
                                    </button>
                                    <button
                                        onClick={() => setPrintDesign("classic")}
                                        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                                            printDesign === "classic" ? "bg-amber-400 text-slate-950 font-black" : "text-slate-600 hover:text-slate-900"
                                        }`}
                                    >
                                        Kuning (Excel)
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Sub-Bar 2: Fleet / Vehicle Tabs (The Core Operational Hub) */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-white">
                    <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                        <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1 mr-1">
                            <Truck className="h-3.5 w-3.5 text-slate-500" />
                            Armada:
                        </span>

                        {/* All Deliveries Tab */}
                        <button
                            onClick={() => setActiveDriverTab("ALL")}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                activeDriverTab === "ALL"
                                    ? "bg-slate-900 text-white shadow-xs"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                        >
                            <span>Semua Armada</span>
                            <span className="text-[10px] font-black opacity-80">({items.length})</span>
                        </button>

                        {/* Unassigned / Loading Queue Tab */}
                        <button
                            onClick={() => setActiveDriverTab("UNASSIGNED")}
                            className={`px-3 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                                activeDriverTab === "UNASSIGNED"
                                    ? "bg-amber-500 text-white shadow-xs"
                                    : fleetBreakdown.unassigned.itemsCount > 0
                                        ? "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                                        : "bg-slate-100 text-slate-500"
                            }`}
                        >
                            <span>📦 Belum Dimuat</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                                activeDriverTab === "UNASSIGNED" ? "bg-white/20 text-white" : "bg-amber-200 text-amber-900"
                            }`}>
                                {fleetBreakdown.unassigned.itemsCount}
                            </span>
                        </button>

                        {/* Individual Vehicle Tabs */}
                        {activeDrivers.map(drv => {
                            const stat = fleetBreakdown.byDriver.get(drv);
                            const count = stat?.itemsCount || 0;
                            const isActive = activeDriverTab === drv;

                            return (
                                <button
                                    key={drv}
                                    onClick={() => setActiveDriverTab(drv)}
                                    className={`px-3 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                                        isActive
                                            ? "bg-indigo-600 text-white shadow-xs"
                                            : "bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 border border-transparent"
                                    }`}
                                >
                                    <span>🚚 {drv}</span>
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                        isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                                    }`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}

                        {/* Add Custom Driver / Vehicle Button */}
                        <button
                            onClick={() => setShowAddDriverModal(true)}
                            className="px-2.5 py-1 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-1 cursor-pointer"
                            title="Tambah Armada / Sopir Baru"
                        >
                            <Plus className="h-3 w-3" />
                            <span>Armada Baru</span>
                        </button>
                    </div>

                    {/* Quick Print Button for Active Driver */}
                    {activeDriverTab !== "ALL" && activeDriverTab !== "UNASSIGNED" && (
                        <button
                            onClick={() => handleQuickPrintVehicle(activeDriverTab)}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                        >
                            <Printer className="h-3.5 w-3.5" />
                            <span>Cetak Form {activeDriverTab}</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
                {/* Stats Bar (No-Print) */}
                <div className="no-print grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
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
                            Armada / Driver Siap
                        </span>
                        <div className="text-xl font-black text-amber-600 mt-1">{assignedDrivers.length} Mobil / Sopir</div>
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
                            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all cursor-pointer"
                            title="Refresh Data"
                        >
                            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                        </button>
                    </div>
                </div>

                {/* BATCH ASSIGNMENT FLOATING ACTION BAR */}
                {selectedItemIds.size > 0 && viewMode === "edit" && (
                    <div className="no-print bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 mb-4 border border-slate-800 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-2.5">
                            <span className="bg-emerald-500 text-slate-950 text-xs font-black px-2 py-0.5 rounded-lg flex items-center gap-1">
                                <CheckSquare className="h-3.5 w-3.5" />
                                {selectedItemIds.size} Terpilih
                            </span>
                            <span className="text-xs text-slate-300 font-semibold">
                                Masukkan seluruh barang yang dicentang ke dalam kendaraan:
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative">
                                <input
                                    list="driver-suggestions"
                                    type="text"
                                    value={bulkDriver}
                                    onChange={(e) => setBulkDriver(e.target.value.toUpperCase())}
                                    placeholder="Ketik/Pilih Driver..."
                                    className="bg-white text-slate-900 px-3 py-1.5 rounded-xl text-xs font-black uppercase outline-none focus:ring-2 focus:ring-emerald-400 min-w-[180px]"
                                />
                            </div>

                            <button
                                onClick={() => handleBulkAssignDriver(bulkDriver)}
                                disabled={!bulkDriver.trim()}
                                className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-black px-4 py-1.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                            >
                                <Truck className="h-4 w-4" />
                                <span>Muat ke Kendaraan</span>
                            </button>

                            <button
                                onClick={() => setSelectedItemIds(new Set())}
                                className="text-slate-400 hover:text-white px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer"
                            >
                                Batal
                            </button>
                        </div>
                    </div>
                )}

                {/* EDIT MODE: Interactive Table with Checkbox & Vehicle Assignment */}
                {viewMode === "edit" && (
                    <div className="no-print bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-8">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                                        Pemuatan Barang ke Kendaraan (Loading Dock)
                                    </h3>
                                    {activeDriverTab !== "ALL" && (
                                        <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase bg-indigo-100 text-indigo-800">
                                            Armada: {activeDriverTab}
                                        </span>
                                    )}
                                    {taxFilter !== "ALL" && (
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                                            taxFilter === "KB-TRN" ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"
                                        }`}>
                                            {taxFilter}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Centang baris barang yang akan dimuat ke mobil yang sama, lalu pilih Sopir untuk penugasan massal sekaligus.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleSaveBatchMapping}
                                    disabled={isBatchSaving || items.length === 0}
                                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                                    title="Simpan mapping ini sebagai referensi info untuk Admin Purchase"
                                >
                                    {isBatchSaving ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="h-4 w-4" />
                                    )}
                                    <span>Simpan Mapping Gudang</span>
                                </button>
                                <button
                                    onClick={handleAddManualRow}
                                    className="flex items-center gap-1.5 bg-slate-900 hover:bg-black text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>Tambah Baris</span>
                                </button>
                            </div>
                        </div>

                        {batchSaveMessage && (
                            <div className="p-3 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between text-xs text-emerald-800 font-bold">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                                    <span>{batchSaveMessage}</span>
                                </div>
                                <span className="text-[10px] text-emerald-700 uppercase bg-emerald-100 px-2.5 py-0.5 rounded font-black">
                                    Tersimpan untuk Info Purchase
                                </span>
                            </div>
                        )}

                        {displayedItems.length === 0 ? (
                            <div className="text-center py-16 px-4">
                                <Truck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                                <h4 className="text-base font-bold text-slate-700">
                                    {activeDriverTab === "UNASSIGNED" 
                                        ? "Semua barang sudah berhasil dimuat ke armada kendaraan!" 
                                        : `Tidak ada muatan untuk armada ${activeDriverTab}`}
                                </h4>
                                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                                    {activeDriverTab === "UNASSIGNED"
                                        ? "Hebat! Semua pesanan pada tanggal ini sudah memiliki sopir / armada masing-masing."
                                        : "Pilih tab 'Belum Dimuat' untuk memindahkan barang ke armada ini, atau tambahkan baris pengiriman baru."}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black uppercase tracking-wider text-[11px]">
                                            {/* Master Checkbox */}
                                            <th className="py-3 px-3 w-10 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isAllDisplayedSelected}
                                                    onChange={handleToggleSelectAll}
                                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                    title="Pilih / Batalkan Semua Baris Ini"
                                                />
                                            </th>
                                            <th className="py-3 px-2 w-8 text-center">NO</th>
                                            <th className="py-3 px-3 w-28">FAKTUR / TIPE</th>
                                            <th className="py-3 px-3 w-28">NO. PO</th>
                                            <th className="py-3 px-4 w-40">BUYER / CUSTOMER</th>
                                            <th className="py-3 px-4">NAMA PRODUK</th>
                                            <th className="py-3 px-3 w-16 text-right">QTY</th>
                                            <th className="py-3 px-4 w-44">DRIVER / KENDARAAN</th>
                                            <th className="py-3 px-3 w-12 text-center">AKSI</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {displayedItems.map((item, index) => {
                                            const isSelected = selectedItemIds.has(item.id);
                                            const isDelivSaved = item.deliveryId && saveStatus[item.deliveryId] === "saved";
                                            const isDelivSaving = item.deliveryId && saveStatus[item.deliveryId] === "saving";

                                            return (
                                                <tr 
                                                    key={item.id} 
                                                    className={`transition-colors ${
                                                        isSelected ? "bg-indigo-50/70" : "hover:bg-slate-50/80"
                                                    }`}
                                                >
                                                    {/* Row Checkbox */}
                                                    <td className="py-2.5 px-3 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => handleToggleSelectItem(item.id, item.deliveryId)}
                                                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                        />
                                                    </td>

                                                    <td className="py-2.5 px-2 text-center text-slate-400 font-bold">
                                                        {index + 1}
                                                    </td>
                                                    <td className="py-2.5 px-3">
                                                        <select
                                                            value={item.taxType}
                                                            onChange={(e) => handleManualRowChange(item.id, "taxType", e.target.value)}
                                                            className={`border px-2 py-1 rounded text-xs font-black outline-none ${
                                                                item.taxType === "KB-TRN"
                                                                    ? "bg-blue-50 border-blue-200 text-blue-800"
                                                                    : "bg-emerald-50 border-emerald-200 text-emerald-800"
                                                            }`}
                                                        >
                                                            <option value="KB-TRN">KB-TRN (PKP)</option>
                                                            <option value="KB-TRD">KB-TRD (NON-PKP)</option>
                                                        </select>
                                                    </td>
                                                    <td className="py-2.5 px-3">
                                                        <input
                                                            type="text"
                                                            value={item.poNumber}
                                                            onChange={(e) => handleManualRowChange(item.id, "poNumber", e.target.value)}
                                                            placeholder="No. PO"
                                                            className="w-full bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-amber-500 px-2 py-1 rounded text-xs font-bold text-slate-800 outline-none"
                                                        />
                                                    </td>
                                                    <td className="py-2.5 px-4">
                                                        <input
                                                            list="customer-suggestions"
                                                            type="text"
                                                            value={item.buyerName}
                                                            onChange={(e) => handleManualRowChange(item.id, "buyerName", e.target.value.toUpperCase())}
                                                            placeholder="Nama Buyer"
                                                            className="w-full bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-amber-500 px-2 py-1 rounded text-xs font-bold text-slate-800 uppercase outline-none"
                                                        />
                                                    </td>
                                                    <td className="py-2.5 px-4">
                                                        <input
                                                            list="product-suggestions"
                                                            type="text"
                                                            value={item.productName}
                                                            onChange={(e) => handleManualRowChange(item.id, "productName", e.target.value)}
                                                            placeholder="Nama Produk"
                                                            className="w-full bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-amber-500 px-2 py-1 rounded text-xs font-medium text-slate-800 uppercase outline-none"
                                                        />
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right">
                                                        <input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => handleManualRowChange(item.id, "quantity", Number(e.target.value))}
                                                            className="w-16 text-right bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-amber-500 px-2 py-1 rounded text-xs font-black text-slate-900 outline-none"
                                                        />
                                                    </td>
                                                    <td className="py-2.5 px-4">
                                                        <div className="flex items-center gap-1.5">
                                                            <input
                                                                list="driver-suggestions"
                                                                type="text"
                                                                value={item.driver}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    handleManualRowChange(item.id, "driver", val.toUpperCase());
                                                                    if (item.deliveryId) {
                                                                        handleDriverChange(item.deliveryId, val);
                                                                    }
                                                                }}
                                                                placeholder="PILIH DRIVER"
                                                                className={`w-full px-2.5 py-1 rounded-lg text-xs font-black uppercase transition-all outline-none ${
                                                                    item.driver && item.driver !== "PILIH DRIVER"
                                                                        ? "bg-indigo-50/80 border border-indigo-200 text-indigo-950 focus:bg-white focus:border-indigo-500"
                                                                        : "bg-amber-50/70 border border-amber-200 text-amber-900 focus:bg-white focus:border-amber-500"
                                                                }`}
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
                                                        <button
                                                            onClick={() => handleRemoveRow(item.id)}
                                                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                                            title="Hapus baris ini"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
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

                {/* PREVIEW & PRINT READY VIEW: OUTPUT FORM MASING-MASING KENDARAAN */}
                <div className={`mx-auto max-w-[210mm] ${viewMode === "edit" ? "hidden print:block" : "block"}`}>
                    
                    {/* OPTION A: FORM SURAT MUATAN PER KENDARAAN (LOADING MANIFEST) */}
                    {printScope === "VEHICLE_MANIFEST" && (
                        <div className="space-y-8">
                            {driversToRender.length === 0 ? (
                                <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl p-6">
                                    <Truck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                                    <h4 className="text-base font-bold text-slate-700">Belum ada pengiriman dengan armada ini</h4>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Kembali ke tab &quot;Input & Muat Kendaraan&quot; dan tetapkan driver pada pengiriman yang ada.
                                    </p>
                                </div>
                            ) : (
                                driversToRender.map((driverName, dIdx) => {
                                    const driverItems = itemsGroupedByDriver.get(driverName) || [];
                                    const driverTotalQty = driverItems.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);
                                    const driverUniqueSJ = new Set(driverItems.map(i => i.deliveryId || i.id)).size;
                                    const isLast = dIdx === driversToRender.length - 1;

                                    return (
                                        <div 
                                            key={driverName} 
                                            className={`bg-white border border-slate-300 rounded-xl shadow-lg p-6 sm:p-9 ${
                                                !isLast ? "page-break-after mb-8" : ""
                                            }`}
                                        >
                                            {/* Manifest Header */}
                                            <div className="border-b-2 border-slate-900 pb-3">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h2 className="text-base sm:text-lg font-black text-slate-950 uppercase tracking-tight">
                                                            PT. KOLA BORASI INDONESIA
                                                        </h2>
                                                        <p className="text-[9.5px] text-slate-600 font-semibold tracking-wider uppercase mt-0.5">
                                                            Logistik Gudang & Distribusi Pengiriman Terpadu
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="inline-block px-3 py-1 rounded text-xs font-black uppercase tracking-wider bg-slate-900 text-white">
                                                            SURAT MUATAN KENDARAAN (LOADING MANIFEST)
                                                        </span>
                                                        <p className="text-[10px] font-mono text-slate-500 mt-1">
                                                            TANGGAL: {dateFormattedIndo}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Vehicle & Driver Prominent Info Box */}
                                                <div className="grid grid-cols-4 gap-2 text-[10px] bg-slate-100/90 p-2.5 rounded border border-slate-300 mt-3">
                                                    <div>
                                                        <span className="text-slate-500 block uppercase font-bold text-[9px]">Sopir / Driver:</span>
                                                        <span className="font-black text-slate-950 text-xs sm:text-sm uppercase tracking-wide">
                                                            🚚 {driverName === "BELUM_DIATUR" ? "BELUM ADA DRIVER" : driverName}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500 block uppercase font-bold text-[9px]">Kategori Faktur:</span>
                                                        <span className="font-black text-slate-900 uppercase">
                                                            {taxFilter === "ALL" ? "GABUNGAN" : taxFilter}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500 block uppercase font-bold text-[9px]">Total Surat Jalan (Drop):</span>
                                                        <span className="font-black text-slate-900 text-xs">
                                                            {driverUniqueSJ} Surat Jalan
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500 block uppercase font-bold text-[9px]">Total Fisik Muatan:</span>
                                                        <span className="font-black text-blue-700 text-xs">
                                                            {driverTotalQty.toLocaleString("id-ID")} Unit
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Manifest Table */}
                                            <div className="mt-3">
                                                <table className="w-full print-table border-collapse text-black text-[10px]">
                                                    <thead>
                                                        <tr className="bg-slate-900 text-white text-[9.5px] font-black uppercase">
                                                            <th className="border border-slate-800 py-1.5 px-1 w-7 text-center">NO</th>
                                                            <th className="border border-slate-800 py-1.5 px-2 w-28 text-center">NO. FAKTUR</th>
                                                            <th className="border border-slate-800 py-1.5 px-2 w-24 text-center">NO. PO</th>
                                                            <th className="border border-slate-800 py-1.5 px-2.5 w-36 text-center">BUYER / TUJUAN</th>
                                                            <th className="border border-slate-800 py-1.5 px-3 text-center">NAMA PRODUK</th>
                                                            <th className="border border-slate-800 py-1.5 px-2 w-14 text-center">QTY</th>
                                                            <th className="border border-slate-800 py-1.5 px-1.5 w-14 text-center">CEK GUDANG</th>
                                                            <th className="border border-slate-800 py-1.5 px-1.5 w-14 text-center">CEK SOPIR</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(() => {
                                                            let lastDelivId: string | null = null;
                                                            let deliveryIndex = 0;

                                                            return driverItems.map((item, idx) => {
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
                                                                        <td className="border border-slate-400 py-1 px-1 text-center font-bold text-[9.5px]">
                                                                            {isFirstOfDeliv ? deliveryIndex : ""}
                                                                        </td>
                                                                        <td className="border border-slate-400 py-1 px-1.5 font-bold text-[9px] uppercase whitespace-nowrap">
                                                                            {isFirstOfDeliv ? (
                                                                                <div>
                                                                                    <span className="block font-black">{item.invoiceNumber || item.taxType}</span>
                                                                                    <span className="text-[8px] text-slate-500 font-mono">{item.deliveryNumber}</span>
                                                                                </div>
                                                                            ) : ""}
                                                                        </td>
                                                                        <td className="border border-slate-400 py-1 px-1.5 font-semibold uppercase text-[9px]">
                                                                            {isFirstOfDeliv ? (item.poNumber || "-") : ""}
                                                                        </td>
                                                                        <td className="border border-slate-400 py-1 px-2 font-bold uppercase text-[9.5px]">
                                                                            {isFirstOfDeliv ? item.buyerName : ""}
                                                                        </td>
                                                                        <td className="border border-slate-400 py-1 px-2 uppercase font-medium text-[9.5px]">
                                                                            {item.productName}
                                                                        </td>
                                                                        <td className="border border-slate-400 py-1 px-1 text-center font-black text-[10px]">
                                                                            {Number(item.quantity) > 0 ? Number(item.quantity).toLocaleString("id-ID") : ""}
                                                                        </td>
                                                                        {/* Checker checkmark box */}
                                                                        <td className="border border-slate-400 py-1 px-1 text-center">
                                                                            <div className="w-3.5 h-3.5 border border-slate-600 mx-auto rounded-xs" />
                                                                        </td>
                                                                        {/* Driver checkmark box */}
                                                                        <td className="border border-slate-400 py-1 px-1 text-center">
                                                                            <div className="w-3.5 h-3.5 border border-slate-600 mx-auto rounded-xs" />
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            });
                                                        })()}
                                                    </tbody>
                                                    <tfoot>
                                                        <tr className="bg-slate-100 font-black text-[10px]">
                                                            <td colSpan={5} className="border border-slate-400 py-1.5 px-3 text-right uppercase">
                                                                TOTAL MUATAN ARMADA INI:
                                                            </td>
                                                            <td className="border border-slate-400 py-1.5 px-1 text-center text-blue-800 font-black">
                                                                {driverTotalQty.toLocaleString("id-ID")}
                                                            </td>
                                                            <td colSpan={2} className="border border-slate-400 py-1.5 px-2 text-center text-[8.5px] text-slate-500">
                                                                Unit / Koli
                                                            </td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>

                                            {/* Signatures & Serah Terima Fisik Muatan */}
                                            <div className="avoid-break pt-3 mt-4 border-t border-slate-300">
                                                <div className="grid grid-cols-3 gap-4 text-center text-xs">
                                                    <div className="flex flex-col justify-between h-24 border border-slate-200 p-2 rounded">
                                                        <span className="text-[9.5px] font-black uppercase text-slate-600">Disiapkan / Checker Gudang</span>
                                                        <div className="border-b border-slate-400 w-4/5 mx-auto pb-0.5">
                                                            ( ............................................ )
                                                        </div>
                                                        <span className="text-[8.5px] text-slate-400">Petugas Muat</span>
                                                    </div>
                                                    <div className="flex flex-col justify-between h-24 border border-slate-200 p-2 rounded bg-slate-50/50">
                                                        <span className="text-[9.5px] font-black uppercase text-slate-700">Diterima di Kendaraan (Sopir)</span>
                                                        <div className="border-b border-slate-400 w-4/5 mx-auto pb-0.5 font-bold text-[9.5px]">
                                                            ( {driverName === "BELUM_DIATUR" ? "............................................" : driverName} )
                                                        </div>
                                                        <span className="text-[8.5px] text-slate-400">Driver Bertanggung Jawab</span>
                                                    </div>
                                                    <div className="flex flex-col justify-between h-24 border border-slate-200 p-2 rounded">
                                                        <span className="text-[9.5px] font-black uppercase text-slate-600">Mengetahui / Mengesahkan</span>
                                                        <div className="border-b border-slate-400 w-4/5 mx-auto pb-0.5">
                                                            ( ............................................ )
                                                        </div>
                                                        <span className="text-[8.5px] text-slate-400">Kepala Gudang / Logistik</span>
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-center text-[8px] text-slate-400 mt-3 px-1">
                                                    <span>Perhatian: Seluruh fisik muatan wajib dihitung bersama Checker Gudang sebelum kendaraan meninggalkan loading dock.</span>
                                                    <span>Dicetak: {format(new Date(), "dd/MM/yyyy HH:mm")} WIB • ERP System</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* OPTION B: DAILY RECAP (ALL IN ONE COMPANY TABLE) */}
                    {printScope === "DAILY_RECAP" && (
                        <div className="bg-white border border-slate-300 rounded-xl shadow-lg p-6 sm:p-9">
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
                                            {taxFilter === "KB-TRN" ? "REKAP FAKTUR KB-TRN (PKP)" : taxFilter === "KB-TRD" ? "REKAP FAKTUR KB-TRD (NON-PKP)" : "REKAP GABUNGAN (KB-TRN & KB-TRD)"}
                                        </span>
                                        <p className="text-[10px] font-mono text-slate-500 mt-1">
                                            TANGGAL: {dateFormattedIndo}
                                        </p>
                                    </div>
                                </div>

                                <div className="text-center mt-3 pt-2 border-t border-slate-200">
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                                        REKAP GABUNGAN PENGIRIMAN HARIAN GUDANG
                                    </h3>
                                </div>
                            </div>

                            {/* Summary Metadata Box */}
                            <div className="grid grid-cols-4 gap-2 text-[10px] bg-slate-50 p-2.5 rounded border border-slate-300 mt-4 mb-4">
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

                            {/* Professional Corporate Table */}
                            <table className="w-full print-table border-collapse text-black text-[10px]">
                                <thead>
                                    <tr className="bg-slate-900 text-white text-[9.5px] font-black uppercase">
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
                                                    <td className="border border-slate-400 py-1 px-1 text-center font-bold text-[9.5px]">
                                                        {isFirstOfDeliv ? deliveryIndex : ""}
                                                    </td>
                                                    <td className="border border-slate-400 py-1 px-1.5 font-bold text-[9px] uppercase whitespace-nowrap">
                                                        {isFirstOfDeliv ? (
                                                            <div>
                                                                <span className="block font-black">{item.invoiceNumber || item.taxType}</span>
                                                                <span className="text-[8px] text-slate-500 font-mono">{item.deliveryNumber}</span>
                                                            </div>
                                                        ) : ""}
                                                    </td>
                                                    <td className="border border-slate-400 py-1 px-1.5 font-semibold uppercase text-[9px]">
                                                        {isFirstOfDeliv ? (item.poNumber || "-") : ""}
                                                    </td>
                                                    <td className="border border-slate-400 py-1 px-2 font-bold uppercase text-[9.5px]">
                                                        {isFirstOfDeliv ? item.buyerName : ""}
                                                    </td>
                                                    <td className="border border-slate-400 py-1 px-2 uppercase font-medium text-[9.5px]">
                                                        {item.productName}
                                                    </td>
                                                    <td className="border border-slate-400 py-1 px-1 text-center font-black text-[10px]">
                                                        {Number(item.quantity) > 0 ? Number(item.quantity).toLocaleString("id-ID") : ""}
                                                    </td>
                                                    <td className="border border-slate-400 py-1.5 px-2 text-center font-black uppercase text-[9.5px] whitespace-nowrap">
                                                        {isFirstOfDeliv ? item.driver : ""}
                                                    </td>
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
                                    <span>Catatan: Rekapitulasi seluruh pengiriman harian untuk arsip operasional dan pembukuan.</span>
                                    <span>Dicetak pada: {format(new Date(), "dd/MM/yyyy HH:mm")} WIB • ERP System</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Modal: Tambah Armada / Sopir Baru */}
            {showAddDriverModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                                <Truck className="h-4 w-4 text-indigo-600" />
                                <span>Tambah Armada / Sopir Baru</span>
                            </h4>
                            <button
                                onClick={() => setShowAddDriverModal(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                                Nama Sopir / No. Kendaraan:
                            </label>
                            <input
                                type="text"
                                value={newDriverInput}
                                onChange={(e) => setNewDriverInput(e.target.value.toUpperCase())}
                                placeholder="Contoh: KUSWARA, TIO, MOBIL 1"
                                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-black text-slate-900 uppercase outline-none"
                                autoFocus
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => setShowAddDriverModal(false)}
                                className="px-3.5 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 rounded-xl cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => {
                                    const val = newDriverInput.trim().toUpperCase();
                                    if (val) {
                                        setCustomDrivers(prev => Array.from(new Set([...prev, val])));
                                        setActiveDriverTab(val);
                                        setNewDriverInput("");
                                        setShowAddDriverModal(false);
                                    }
                                }}
                                disabled={!newDriverInput.trim()}
                                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-1.5 text-xs font-black uppercase rounded-xl shadow-xs transition-all cursor-pointer"
                            >
                                Tambahkan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ShippingScheduleDashboard;
