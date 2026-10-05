"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import { format, addDays, subDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { 
    Calendar, Printer, Download, Plus, Trash2, Save, 
    Truck, ArrowLeft, RefreshCw, CheckCircle2, AlertCircle,
    Eye, Edit3, ShieldAlert, FileText, CheckSquare, Square, Layers, X, 
    UserCheck, ArrowRight, RotateCcw, ListFilter, ClipboardCheck, History,
    CreditCard
} from "lucide-react";
import Link from "next/link";
import { callAction } from "@/proxy";
import * as XLSX from "xlsx";
import { OFFICIAL_FLEET, getFleetByDriverOrPlate } from "@/lib/fleet";

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
    vehiclePlate?: string;
    etollCard?: string;
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
    "KARNO",
    "KUSWARA",
    "RAHMAT. H",
    "CARSIKA",
    "HERU",
    "TIO",
    "MAMET",
    "KARIM",
    "ROKHMAN",
    "EKSPEDISI",
    "TATANG",
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
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

    // Main View Navigation: "WIZARD" (Proses Muat Baru), "FLEET_HISTORY" (Armada Selesai Dimuat), "FULL_RECAP" (Rekap Gabungan Harian)
    const [mainView, setMainView] = useState<"WIZARD" | "FLEET_HISTORY" | "FULL_RECAP">("WIZARD");

    // E-Commerce Style 3-Step Wizard:
    // Step 1: SELECT (Pilih Muatan & Tentukan Sopir/Kendaraan)
    // Step 2: VERIFY (Halaman Verifikasi & Cek Fisik Barang)
    // Step 3: PRINT (Cetak Form Validasi Surat Muatan Kendaraan)
    const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);

    // Wizard Form States
    const [selectedDriver, setSelectedDriver] = useState<string>("");
    const [selectedVehiclePlate, setSelectedVehiclePlate] = useState<string>("");
    const [selectedEtoll, setSelectedEtoll] = useState<string>("");

    const handleDriverSelect = (driverVal: string) => {
        const upper = driverVal.toUpperCase();
        setSelectedDriver(upper);
        const fleet = getFleetByDriverOrPlate(upper);
        if (fleet) {
            setSelectedVehiclePlate(fleet.plate);
            setSelectedEtoll(fleet.etoll);
        }
    };

    const handlePlateSelect = (plateVal: string) => {
        const upper = plateVal.toUpperCase();
        setSelectedVehiclePlate(upper);
        const fleet = getFleetByDriverOrPlate(upper);
        if (fleet) {
            if (!selectedDriver) setSelectedDriver(fleet.driver);
            setSelectedEtoll(fleet.etoll);
        }
    };

    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
    const [lastCompletedDriver, setLastCompletedDriver] = useState<string>("");
    const [physicalChecklist, setPhysicalChecklist] = useState<Record<string, boolean>>({});
    const [editingDriver, setEditingDriver] = useState<string | null>(null);
    const [unloadingDriver, setUnloadingDriver] = useState<string | null>(null);

    // Tax Filter for selection/table
    const [taxFilter, setTaxFilter] = useState<"ALL" | "KB-TRN" | "KB-TRD">("ALL");

    // Custom driver additions
    const [customDrivers, setCustomDrivers] = useState<string[]>([]);
    const [newDriverInput, setNewDriverInput] = useState<string>("");
    const [showAddDriverModal, setShowAddDriverModal] = useState<boolean>(false);

    // Helper: Generate Clean & Realistic Invoice Number
    const getRealisticInvoiceNumber = (item: Partial<ScheduleItem>, index: number = 0): string => {
        const inv = item.invoiceNumber?.trim() || "";
        if (inv && !inv.includes("(MAPPING)") && !inv.includes("(MANUAL)") && (inv.startsWith("KB-TRN-") || inv.startsWith("KB-TRD-"))) {
            return inv;
        }

        const dateCode = format(new Date(selectedDate), "ddMMyyyy");
        const prefix = item.taxType === "KB-TRN" ? "KB-TRN" : "KB-TRD";

        // Try extracting sequence suffix from deliveryNumber: e.g. SJ-xxx-05102026-015 -> 015
        const sjMatch = item.deliveryNumber?.match(/-(\d+)$/);
        const seq = sjMatch ? sjMatch[1] : String(index + 1).padStart(3, "0");

        return `${prefix}-${dateCode}-${seq}`;
    };

    // Transform deliveries into flat schedule items with REALISTIC invoice numbers
    const buildItemsFromDeliveries = (delivs: any[]): ScheduleItem[] => {
        const rows: ScheduleItem[] = [];
        delivs.forEach((d, dIdx) => {
            const po = d.poNumber || "-";
            const buyer = d.buyerName || "-";
            const driver = d.driver || "";
            const isTRN = (d.invoiceNumber && d.invoiceNumber.startsWith("KB-TRN")) || Number(d.taxRate || 0) > 0;
            const taxType: "KB-TRN" | "KB-TRD" = isTRN ? "KB-TRN" : "KB-TRD";
            
            // Format realistic invoice number
            const dateCode = format(new Date(selectedDate), "ddMMyyyy");
            const fallbackInv = `${taxType}-${dateCode}-${String(dIdx + 1).padStart(3, "0")}`;
            const inv = d.invoiceNumber && d.invoiceNumber.trim() ? d.invoiceNumber : fallbackInv;
            
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
                        productName: it.productName || it.product?.name || "Item",
                        quantity: Number(it.quantity || 0),
                        driver: driver,
                        isManual: false
                    });
                });
            }
        });
        return rows;
    };

    // Fallback: build items from mappings if deliveries empty
    const buildItemsFromMappings = (maps: any[], delivs: any[] = []): ScheduleItem[] => {
        const dateCode = format(new Date(selectedDate), "ddMMyyyy");
        return maps.map((m: any, idx: number) => {
            const taxType = (m.category === "KB-TRN" ? "KB-TRN" : "KB-TRD") as "KB-TRN" | "KB-TRD";
            const rawPo = (m.poNumber || "").trim();
            const isCategoryPo = rawPo.toUpperCase() === "NON PKP" || rawPo.toUpperCase() === "PKP";

            // Check if there is a matching real delivery for this buyer
            const matchedDeliv = delivs.find(d => 
                d.buyerName?.trim().toLowerCase() === m.buyerName?.trim().toLowerCase()
            );

            const realisticInv = matchedDeliv?.invoiceNumber?.trim() 
                ? matchedDeliv.invoiceNumber.trim() 
                : `${taxType}-${dateCode}-${String(idx + 1).padStart(3, "0")}`;

            const cleanPo = !isCategoryPo && rawPo ? rawPo : (matchedDeliv?.poNumber || "-");

            return {
                id: m.id,
                deliveryId: matchedDeliv?.id,
                deliveryNumber: matchedDeliv?.deliveryNumber || `SJ-${dateCode}-${String(idx + 1).padStart(3, "0")}`,
                invoiceNumber: realisticInv,
                taxType: taxType,
                poNumber: cleanPo,
                buyerName: m.buyerName || "-",
                productName: m.productName || "-",
                quantity: Number(m.quantity || 0),
                driver: m.driver || matchedDeliv?.driver || "",
                isManual: !matchedDeliv
            };
        });
    };

    // Initialize items: prioritize real deliveries
    useEffect(() => {
        if (deliveries && deliveries.length > 0) {
            setItems(buildItemsFromDeliveries(deliveries));
        } else if (initialMappings && initialMappings.length > 0) {
            setItems(buildItemsFromMappings(initialMappings, initialDeliveries || []));
        } else {
            setItems([]);
        }
    }, [deliveries, initialMappings]);

    // Fetch deliveries and mappings when selectedDate changes
    const fetchSchedule = async (dateStr: string) => {
        setIsLoading(true);
        try {
            const [delivRes, mapRes] = await Promise.all([
                callAction("getDailyShippingSchedule", dateStr),
                callAction("getShippingMappings", dateStr, "ALL")
            ]);
            if (Array.isArray(delivRes) && delivRes.length > 0) {
                setDeliveries(delivRes);
                setItems(buildItemsFromDeliveries(delivRes));
            } else if (Array.isArray(mapRes) && mapRes.length > 0) {
                setItems(buildItemsFromMappings(mapRes, delivRes || []));
            } else {
                setDeliveries([]);
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
        setWizardStep(1);
        fetchSchedule(newDate);
    };

    // Drivers currently active in items
    const activeDrivers = useMemo(() => {
        const set = new Set<string>();
        items.forEach(i => {
            const d = (i.driver || "").trim().toUpperCase();
            if (d && d !== "PILIH DRIVER" && d !== "-") set.add(d);
        });
        customDrivers.forEach(d => set.add(d.trim().toUpperCase()));
        return Array.from(set).sort();
    }, [items, customDrivers]);

    const allDriverOptions = useMemo(() => {
        const set = new Set<string>(COMMON_DRIVERS);
        activeDrivers.forEach(d => set.add(d));
        return Array.from(set).sort();
    }, [activeDrivers]);

    // SEPARATION OF QUEUES:
    // 1. selectableItems: Items that can be selected in Step 1.
    //    If editingDriver is set, includes unassigned items PLUS items belonging to editingDriver.
    //    If not editing, includes only unassigned items.
    // 2. loadedQueue: Items that have been loaded into vehicles (shown in Completed Fleet)
    const selectableItems = useMemo(() => {
        return items.filter(item => {
            const drv = (item.driver || "").trim().toUpperCase();
            const isUnassigned = !drv || drv === "PILIH DRIVER" || drv === "-";
            const isBelongingToCurrentEdit = editingDriver && drv === editingDriver.toUpperCase();
            if (!isUnassigned && !isBelongingToCurrentEdit) return false;
            if (taxFilter !== "ALL" && item.taxType !== taxFilter) return false;
            return true;
        });
    }, [items, taxFilter, editingDriver]);

    const unassignedItems = useMemo(() => {
        return items.filter(item => {
            const drv = (item.driver || "").trim().toUpperCase();
            const isUnassigned = !drv || drv === "PILIH DRIVER" || drv === "-";
            if (!isUnassigned) return false;
            if (taxFilter !== "ALL" && item.taxType !== taxFilter) return false;
            return true;
        });
    }, [items, taxFilter]);

    const loadedItems = useMemo(() => {
        return items.filter(item => {
            const drv = (item.driver || "").trim().toUpperCase();
            return drv && drv !== "PILIH DRIVER" && drv !== "-";
        });
    }, [items]);

    // Group loaded items by driver for the Completed Fleet view
    const loadedByDriver = useMemo(() => {
        const map = new Map<string, ScheduleItem[]>();
        loadedItems.forEach(item => {
            const drv = (item.driver || "").trim().toUpperCase();
            if (!map.has(drv)) {
                map.set(drv, []);
            }
            map.get(drv)!.push(item);
        });
        return map;
    }, [loadedItems]);

    // Selection handling for Step 1
    const isAllSelectableSelected = selectableItems.length > 0 && selectableItems.every(i => selectedItemIds.has(i.id));

    const handleToggleSelectAll = () => {
        if (isAllSelectableSelected) {
            setSelectedItemIds(new Set());
        } else {
            const next = new Set<string>();
            selectableItems.forEach(i => next.add(i.id));
            setSelectedItemIds(next);
        }
    };

    const handleToggleSelectItem = (id: string, deliveryId?: string) => {
        setSelectedItemIds(prev => {
            const next = new Set(prev);
            if (deliveryId) {
                const siblingItems = selectableItems.filter(i => i.deliveryId === deliveryId);
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

    // Selected items for Step 2 Verification
    const selectedItemsForVerification = useMemo(() => {
        return items.filter(i => selectedItemIds.has(i.id));
    }, [items, selectedItemIds]);

    const selectedTotalQty = selectedItemsForVerification.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);
    const selectedUniqueDeliveries = new Set(selectedItemsForVerification.map(i => i.deliveryId || i.id)).size;

    // Proceed to Step 2 Verification
    const handleProceedToVerification = () => {
        if (!selectedDriver.trim()) {
            alert("Silakan pilih Driver / Sopir kendaraan terlebih dahulu!");
            return;
        }
        if (selectedItemIds.size === 0) {
            alert("Silakan centang minimal 1 barang untuk dimuat ke dalam kendaraan!");
            return;
        }
        // Initialize all physical checkmarks to true by default for fast verification
        const initChecks: Record<string, boolean> = {};
        selectedItemsForVerification.forEach(i => {
            initChecks[i.id] = true;
        });
        setPhysicalChecklist(initChecks);
        setWizardStep(2);
    };

    // Edit an already loaded vehicle
    const handleEditVehicleLoad = (drvName: string) => {
        const cleanDriver = drvName.trim().toUpperCase();
        const fleetInfo = getFleetByDriverOrPlate(cleanDriver);
        const driverItems = items.filter(i => (i.driver || "").trim().toUpperCase() === cleanDriver);
        const targetItemIds = new Set(driverItems.map(i => i.id));

        setEditingDriver(cleanDriver);
        setSelectedDriver(cleanDriver);
        setSelectedVehiclePlate(fleetInfo?.plate || "");
        setSelectedEtoll(fleetInfo?.etoll || "");
        setSelectedItemIds(targetItemIds);
        setMainView("WIZARD");
        setWizardStep(1);
    };

    // CONFIRM LOADING (Step 2 -> Step 3)
    // Saves driver to database and REMOVES items from the unassigned loading queue!
    const handleConfirmLoading = async () => {
        if (!selectedDriver.trim() || selectedItemIds.size === 0) return;
        setIsSaving(true);
        const upperDriver = selectedDriver.trim().toUpperCase();

        try {
            const newlySelectedDelivIds = Array.from(new Set(selectedItemsForVerification.map(i => i.deliveryId).filter(Boolean))) as string[];

            // Find items that were previously assigned to this driver (or editingDriver) that are now REMOVED
            const prevDriverName = (editingDriver || selectedDriver).trim().toUpperCase();
            const previouslyLoadedItems = items.filter(i => (i.driver || "").trim().toUpperCase() === prevDriverName);
            const unselectedItems = previouslyLoadedItems.filter(i => !selectedItemIds.has(i.id));
            const removedDelivIds = Array.from(new Set(unselectedItems.map(i => i.deliveryId).filter(Boolean))) as string[];

            // Update items locally
            setItems(prev => prev.map(item => {
                if (selectedItemIds.has(item.id) || (item.deliveryId && newlySelectedDelivIds.includes(item.deliveryId))) {
                    return { 
                        ...item, 
                        driver: upperDriver,
                        vehiclePlate: selectedVehiclePlate.trim().toUpperCase(),
                        etollCard: selectedEtoll.trim()
                    };
                }
                if ((item.driver || "").trim().toUpperCase() === prevDriverName) {
                    return { ...item, driver: "", vehiclePlate: "", etollCard: "" };
                }
                return item;
            }));

            // Also update deliveries state locally
            setDeliveries(prev => prev.map(d => {
                if (newlySelectedDelivIds.includes(d.id)) {
                    return { ...d, driver: upperDriver, vehicleNumber: upperDriver };
                }
                if (removedDelivIds.includes(d.id)) {
                    return { ...d, driver: "", vehicleNumber: "" };
                }
                return d;
            }));

            // Save in database
            const updatePromises: Promise<any>[] = [];
            newlySelectedDelivIds.forEach(dId => {
                updatePromises.push(callAction("updateDeliveryDriver", dId, upperDriver).catch(console.error));
            });
            removedDelivIds.forEach(dId => {
                updatePromises.push(callAction("updateDeliveryDriver", dId, "").catch(console.error));
            });
            await Promise.all(updatePromises);

            setLastCompletedDriver(upperDriver);
            setEditingDriver(null);
            setWizardStep(3);
            setSaveFeedback(`Barang berhasil disimpan ke armada ${upperDriver}! Form manifest siap dicetak.`);
            setTimeout(() => setSaveFeedback(null), 6000);
        } catch (err: any) {
            console.error("Gagal menyimpan muatan:", err);
            alert("Gagal menyimpan pemuatan: " + (err.message || String(err)));
        } finally {
            setIsSaving(false);
        }
    };

    // Return items from a loaded vehicle back to unassigned queue (Fixed bug & cleans both SalesDelivery and ShippingMapping)
    const handleUnloadVehicle = async (driverName: string) => {
        const cleanDriver = driverName.trim().toUpperCase();
        const confirmUnload = window.confirm(
            `Apakah Anda yakin ingin membatalkan pemuatan untuk armada ${cleanDriver}?\n\nSemua barang pada armada ini akan dikembalikan ke antrian muat lantai gudang.`
        );
        if (!confirmUnload) return;

        setUnloadingDriver(cleanDriver);
        try {
            // 1. Immediately update items locally so UI updates instantly
            setItems(prev => prev.map(item => {
                if ((item.driver || "").trim().toUpperCase() === cleanDriver) {
                    return { ...item, driver: "", vehiclePlate: "", etollCard: "" };
                }
                return item;
            }));

            // 2. Also update deliveries state locally
            setDeliveries(prev => prev.map(d => {
                if ((d.driver || d.vehicleNumber || "").trim().toUpperCase() === cleanDriver) {
                    return { ...d, driver: "", vehicleNumber: "" };
                }
                return d;
            }));

            // 3. Call server action to clear both SalesDelivery and ShippingMapping in database
            await callAction("unloadDriverDeliveries", selectedDate, cleanDriver);

            // If we were editing this driver, reset edit state
            if (editingDriver === cleanDriver) {
                setEditingDriver(null);
                setSelectedItemIds(new Set());
            }

            setSaveFeedback(`Seluruh muatan armada ${cleanDriver} berhasil dibatalkan dan telah kembali ke antrian lantai gudang.`);
            setTimeout(() => setSaveFeedback(null), 6000);
        } catch (err: any) {
            console.error("Gagal membatalkan muatan:", err);
            alert("Terjadi kesalahan saat membatalkan muatan: " + (err.message || String(err)));
            // Re-fetch to guarantee consistency
            await fetchSchedule(selectedDate);
        } finally {
            setUnloadingDriver(null);
        }
    };

    // Reset wizard to load next vehicle
    const handleStartNextVehicle = () => {
        setSelectedItemIds(new Set());
        setSelectedDriver("");
        setSelectedVehiclePlate("");
        setSelectedEtoll("");
        setEditingDriver(null);
        setWizardStep(1);
    };

    // Date formatted for header
    const parsedDate = new Date(selectedDate);
    const dateFormattedIndo = !isNaN(parsedDate.getTime()) 
        ? format(parsedDate, "dd MMMM yyyy", { locale: localeId }).toUpperCase() 
        : selectedDate;

    // Export Excel of all deliveries
    const handleExportExcel = () => {
        if (items.length === 0) {
            alert("Tidak ada data pengiriman untuk diekspor!");
            return;
        }

        const excelRows: any[][] = [];
        excelRows.push([`REKAP PENGIRIMAN HARIAN - ${dateFormattedIndo}`, "", "", "", "", ""]);
        excelRows.push(["NO. FAKTUR", "NO. PO", "BUYER", "PRODUK", "QTY", "DRIVER / KENDARAAN"]);

        let lastDelivId: string | null = null;
        items.forEach((item, idx) => {
            const isFirstOfDeliv = item.isManual || item.deliveryId !== lastDelivId;
            if (!item.isManual && item.deliveryId) {
                lastDelivId = item.deliveryId;
            }

            excelRows.push([
                isFirstOfDeliv ? getRealisticInvoiceNumber(item, idx) : "",
                isFirstOfDeliv ? (item.poNumber || "") : "",
                isFirstOfDeliv ? (item.buyerName || "") : "",
                item.productName || "",
                Number(item.quantity) || 0,
                isFirstOfDeliv ? (item.driver || "") : ""
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(excelRows);
        ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
        ws["!cols"] = [{ wch: 24 }, { wch: 18 }, { wch: 28 }, { wch: 38 }, { wch: 12 }, { wch: 22 }];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Pengiriman");
        XLSX.writeFile(wb, `PENGIRIMAN_${selectedDate.replace(/-/g, "")}.xlsx`);
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
            {/* Print Styles: Dedicated A4 Page per Vehicle Manifest */}
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
                        padding: 4px 6px !important;
                    }
                    .delivery-separator {
                        border-top: 2px solid #000000 !important;
                    }
                    .avoid-break {
                        page-break-inside: avoid !important;
                    }
                }
            `}} />

            {/* Datalists for autocomplete */}
            <datalist id="driver-suggestions">
                {OFFICIAL_FLEET.map(f => (
                    <option key={f.driver} value={f.driver}>{`${f.driver} (${f.plate})`}</option>
                ))}
                {allDriverOptions.map(drv => (
                    <option key={drv} value={drv} />
                ))}
            </datalist>
            <datalist id="plate-suggestions">
                {OFFICIAL_FLEET.map(f => (
                    <option key={f.plate} value={f.plate}>{`${f.plate} - ${f.driver}`}</option>
                ))}
            </datalist>

            {/* Top Toolbar (No-Print) */}
            <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/warehouse"
                            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all shrink-0"
                            title="Kembali ke Gudang"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Link>

                        <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200 p-1 shrink-0">
                            <img 
                                src="/image/logokoboi.png" 
                                alt="Logo PT. Kola Borasi Indonesia" 
                                className="h-8 w-auto object-contain"
                                onError={(e) => {
                                    (e.target as any).src = "/logo.png";
                                }}
                            />
                        </div>

                        <div>
                            <div className="flex items-center gap-2">
                                <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                                    LOGISTIK GUDANG
                                </span>
                                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider hidden sm:inline">
                                    PT. KOLA BORASI INDONESIA
                                </span>
                            </div>
                            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                                Pemuatan Barang ke Kendaraan (Loading Dock)
                            </h1>
                        </div>
                    </div>

                    {/* Date Navigation & Actions */}
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

                        {/* Excel Export */}
                        <button
                            onClick={handleExportExcel}
                            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                            <Download className="h-4 w-4" />
                            <span>Excel</span>
                        </button>
                    </div>
                </div>

                {/* Sub Navigation: Mode Pemuatan vs Riwayat Armada vs Rekap */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
                    <div className="flex bg-white p-0.5 rounded-xl border border-slate-200 shadow-2xs">
                        <button
                            onClick={() => {
                                setMainView("WIZARD");
                                if (wizardStep === 3) setWizardStep(1);
                            }}
                            className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                                mainView === "WIZARD"
                                    ? "bg-slate-900 text-white shadow-xs"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            <Truck className="h-3.5 w-3.5" />
                            <span>Proses Pemuatan Kendaraan</span>
                            {unassignedItems.length > 0 && (
                                <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                                    {unassignedItems.length} Antri
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => setMainView("FLEET_HISTORY")}
                            className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                                mainView === "FLEET_HISTORY"
                                    ? "bg-indigo-600 text-white shadow-xs"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            <ClipboardCheck className="h-3.5 w-3.5" />
                            <span>Armada Sudah Dimuat</span>
                            <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                                {loadedByDriver.size} Mobil
                            </span>
                        </button>

                        <button
                            onClick={() => setMainView("FULL_RECAP")}
                            className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                                mainView === "FULL_RECAP"
                                    ? "bg-slate-800 text-white shadow-xs"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            <FileText className="h-3.5 w-3.5" />
                            <span>Rekap Harian Gabungan</span>
                        </button>
                    </div>

                    {/* Tax Category Filter */}
                    {mainView === "WIZARD" && wizardStep === 1 && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-black uppercase text-slate-400">Filter Pajak:</span>
                            <div className="flex bg-white p-0.5 rounded-lg border border-slate-200">
                                <button
                                    onClick={() => setTaxFilter("ALL")}
                                    className={`px-2 py-0.5 text-xs font-bold rounded cursor-pointer ${
                                        taxFilter === "ALL" ? "bg-slate-900 text-white" : "text-slate-600"
                                    }`}
                                >
                                    Semua
                                </button>
                                <button
                                    onClick={() => setTaxFilter("KB-TRN")}
                                    className={`px-2 py-0.5 text-xs font-bold rounded cursor-pointer ${
                                        taxFilter === "KB-TRN" ? "bg-blue-600 text-white" : "text-blue-700"
                                    }`}
                                >
                                    KB-TRN (PKP)
                                </button>
                                <button
                                    onClick={() => setTaxFilter("KB-TRD")}
                                    className={`px-2 py-0.5 text-xs font-bold rounded cursor-pointer ${
                                        taxFilter === "KB-TRD" ? "bg-emerald-600 text-white" : "text-emerald-700"
                                    }`}
                                >
                                    KB-TRD (NON-PKP)
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* Notification Bar */}
            {saveFeedback && (
                <div className="no-print max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800 font-bold shadow-xs animate-in fade-in">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                            <span>{saveFeedback}</span>
                        </div>
                        <span className="text-[10px] text-emerald-700 uppercase bg-emerald-100 px-2 py-0.5 rounded font-black">
                            Tersimpan di Sistem
                        </span>
                    </div>
                </div>
            )}

            {/* MAIN CONTENT AREA */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
                
                {/* ========================================================================= */}
                {/* VIEW 1: E-COMMERCE STYLE 3-STEP WIZARD (PROSES PEMUATAN KENDARAAN)       */}
                {/* ========================================================================= */}
                {mainView === "WIZARD" && (
                    <div>
                        {/* Stepper Progress Indicator (Like E-Commerce Checkout) */}
                        <div className="no-print mb-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                            <div className="flex items-center justify-center max-w-2xl mx-auto">
                                {/* Step 1 */}
                                <div 
                                    onClick={() => wizardStep > 1 && setWizardStep(1)}
                                    className={`flex items-center gap-2.5 cursor-pointer ${
                                        wizardStep === 1 ? "text-indigo-600 font-black" : "text-slate-700 font-bold"
                                    }`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                                        wizardStep === 1 
                                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105" 
                                            : wizardStep > 1 
                                                ? "bg-emerald-500 text-white" 
                                                : "bg-slate-100 text-slate-500"
                                    }`}>
                                        {wizardStep > 1 ? <CheckCircle2 className="w-5 h-5" /> : "1"}
                                    </div>
                                    <div className="text-left hidden sm:block">
                                        <div className="text-xs uppercase tracking-wider text-slate-400">Tahap 1</div>
                                        <div className="text-xs font-black">Pilih Muatan Mobil</div>
                                    </div>
                                </div>

                                <div className={`flex-1 h-1 mx-3 rounded-full transition-all ${wizardStep > 1 ? "bg-emerald-500" : "bg-slate-200"}`} />

                                {/* Step 2 */}
                                <div 
                                    onClick={() => wizardStep === 3 && setWizardStep(2)}
                                    className={`flex items-center gap-2.5 ${
                                        wizardStep === 2 ? "text-indigo-600 font-black" : wizardStep > 2 ? "text-slate-700 font-bold cursor-pointer" : "text-slate-400 font-medium"
                                    }`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                                        wizardStep === 2 
                                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105" 
                                            : wizardStep > 2 
                                                ? "bg-emerald-500 text-white" 
                                                : "bg-slate-100 text-slate-500"
                                    }`}>
                                        {wizardStep > 2 ? <CheckCircle2 className="w-5 h-5" /> : "2"}
                                    </div>
                                    <div className="text-left hidden sm:block">
                                        <div className="text-xs uppercase tracking-wider text-slate-400">Tahap 2</div>
                                        <div className="text-xs font-black">Verifikasi Fisik</div>
                                    </div>
                                </div>

                                <div className={`flex-1 h-1 mx-3 rounded-full transition-all ${wizardStep > 2 ? "bg-emerald-500" : "bg-slate-200"}`} />

                                {/* Step 3 */}
                                <div className={`flex items-center gap-2.5 ${
                                    wizardStep === 3 ? "text-indigo-600 font-black" : "text-slate-400 font-medium"
                                }`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                                        wizardStep === 3 ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105" : "bg-slate-100 text-slate-500"
                                    }`}>
                                        3
                                    </div>
                                    <div className="text-left hidden sm:block">
                                        <div className="text-xs uppercase tracking-wider text-slate-400">Tahap 3</div>
                                        <div className="text-xs font-black">Cetak Form Validasi</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ------------------------------------------------------------- */}
                        {/* WIZARD STEP 1: PILIH MUATAN & TENTUKAN KENDARAAN             */}
                        {/* ------------------------------------------------------------- */}
                        {wizardStep === 1 && (
                            <div className="space-y-4">
                                {/* Edit Mode Banner if editing an already loaded vehicle */}
                                {editingDriver && (
                                    <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-in fade-in">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black shrink-0">
                                                <Edit3 className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-xs sm:text-sm font-black text-amber-950 uppercase">
                                                    Mode Edit Muatan Armada: {editingDriver}
                                                </h4>
                                                <p className="text-xs text-amber-800">
                                                    Anda sedang mengubah muatan sopir <strong className="font-bold">{editingDriver}</strong>. Hapus centang untuk mengembalikan barang ke antrian gudang, atau centang barang baru dari antrian untuk ditambahkan ke mobil ini.
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setEditingDriver(null);
                                                setSelectedItemIds(new Set());
                                                setSelectedDriver("");
                                                setSelectedVehiclePlate("");
                                                setSelectedEtoll("");
                                            }}
                                            className="px-3.5 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer self-start sm:self-center shrink-0"
                                        >
                                            Batal Edit
                                        </button>
                                    </div>
                                )}

                                {/* Driver Assignment Setup Card */}
                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                                                <Truck className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                                                    1. Tentukan Kendaraan & Sopir Muat
                                                </h3>
                                                <p className="text-xs text-slate-500">
                                                    Pilih sopir dan armada yang sedang parkir di pintu muat gudang.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3">
                                            {/* Driver Select */}
                                            <div className="flex items-center gap-2">
                                                <label className="text-xs font-black text-slate-700 uppercase">Sopir:</label>
                                                <div className="relative">
                                                    <input
                                                        list="driver-suggestions"
                                                        type="text"
                                                        value={selectedDriver}
                                                        onChange={(e) => handleDriverSelect(e.target.value)}
                                                        placeholder="Pilih Sopir (Kuswara, Karno...)"
                                                        className="bg-slate-50 hover:bg-slate-100 focus:bg-white border-2 border-indigo-200 focus:border-indigo-600 px-3.5 py-2 rounded-xl text-xs font-black text-slate-900 uppercase outline-none transition-all min-w-[200px]"
                                                    />
                                                </div>
                                            </div>

                                            {/* Vehicle Plate (Optional) */}
                                            <div className="flex items-center gap-2">
                                                <label className="text-xs font-black text-slate-700 uppercase">No. Polisi:</label>
                                                <input
                                                    list="plate-suggestions"
                                                    type="text"
                                                    value={selectedVehiclePlate}
                                                    onChange={(e) => handlePlateSelect(e.target.value)}
                                                    placeholder="Contoh: B 9198 FCM"
                                                    className="bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-indigo-600 px-3 py-2 rounded-xl text-xs font-bold text-slate-900 uppercase outline-none transition-all w-36"
                                                />
                                            </div>

                                            <button
                                                onClick={() => setShowAddDriverModal(true)}
                                                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                                                title="Tambah Sopir Baru"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Official Fleet Quick Selector & E-Toll Badge */}
                                    <div className="flex flex-wrap items-center gap-1.5 pt-3 mt-3 border-t border-slate-100">
                                        <span className="text-[10px] font-black uppercase text-slate-400 mr-1">Armada Resmi:</span>
                                        {OFFICIAL_FLEET.map(f => {
                                            const isSelected = selectedDriver === f.driver;
                                            return (
                                                <button
                                                    key={f.driver}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedDriver(f.driver);
                                                        setSelectedVehiclePlate(f.plate);
                                                        setSelectedEtoll(f.etoll);
                                                    }}
                                                    className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                                        isSelected 
                                                            ? "bg-indigo-600 text-white shadow-xs" 
                                                            : "bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700"
                                                    }`}
                                                >
                                                    <span>🚚 {f.driver}</span>
                                                    <span className={`text-[10px] font-mono ${isSelected ? "text-indigo-200" : "text-slate-500"}`}>
                                                        {f.plate}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                        {selectedEtoll && (
                                            <div className="ml-auto flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-[11px] font-bold shadow-2xs">
                                                <CreditCard className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                                                <span>E-TOLL: <strong className="font-mono font-black">{selectedEtoll}</strong></span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Table of Deliveries Waiting to be Loaded / Being Edited */}
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                                                <span>2. Centang Pesanan yang Dimuat ke Mobil Ini</span>
                                                <span className={`${editingDriver ? "bg-indigo-100 text-indigo-900" : "bg-amber-100 text-amber-900"} text-[10px] font-black px-2 py-0.5 rounded-full`}>
                                                    {editingDriver 
                                                        ? `${selectableItems.length} Tersedia (Termasuk Muatan ${editingDriver})`
                                                        : `${selectableItems.length} Antri di Lantai Gudang`}
                                                </span>
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {editingDriver 
                                                    ? "Centang untuk menambahkan ke muatan, atau hilangkan centang untuk mengembalikan barang ke antrian gudang."
                                                    : "Barang yang sudah selesai dimuat otomatis tidak muncul lagi di antrian ini."}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={handleToggleSelectAll}
                                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all cursor-pointer"
                                            >
                                                {isAllSelectableSelected ? "Batalkan Semua" : "Pilih Semua"}
                                            </button>
                                        </div>
                                    </div>

                                    {selectableItems.length === 0 ? (
                                        <div className="text-center py-16 px-4">
                                            <Truck className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                                            <h4 className="text-base font-black text-slate-800">
                                                Luar Biasa! Semua Barang Sudah Berhasil Dimuat ke Kendaraan.
                                            </h4>
                                            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                                                Tidak ada lagi barang yang menunggu di antrian muat. Anda dapat melihat riwayat armada di tab &quot;Armada Sudah Dimuat&quot;.
                                            </p>
                                            <button
                                                onClick={() => setMainView("FLEET_HISTORY")}
                                                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer inline-flex items-center gap-2"
                                            >
                                                <ClipboardCheck className="w-4 h-4" />
                                                <span>Lihat Armada Siap Berangkat</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black uppercase tracking-wider text-[11px]">
                                                        <th className="py-3 px-3 w-10 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={isAllSelectableSelected}
                                                                onChange={handleToggleSelectAll}
                                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                            />
                                                        </th>
                                                        <th className="py-3 px-2 w-8 text-center">NO</th>
                                                        <th className="py-3 px-3 w-32">NO. FAKTUR</th>
                                                        <th className="py-3 px-3 w-28">NO. PO</th>
                                                        <th className="py-3 px-4 w-44">BUYER / CUSTOMER</th>
                                                        <th className="py-3 px-4">NAMA PRODUK</th>
                                                        <th className="py-3 px-3 w-20 text-right">QTY</th>
                                                        <th className="py-3 px-3 w-24 text-center">STATUS</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {selectableItems.map((item, index) => {
                                                        const isSelected = selectedItemIds.has(item.id);
                                                        const realInvoice = getRealisticInvoiceNumber(item, index);
                                                        const isAlreadyInEditingFleet = editingDriver && (item.driver || "").trim().toUpperCase() === editingDriver;

                                                        return (
                                                            <tr 
                                                                key={item.id} 
                                                                onClick={() => handleToggleSelectItem(item.id, item.deliveryId)}
                                                                className={`cursor-pointer transition-colors ${
                                                                    isSelected ? "bg-indigo-50/80 font-semibold" : "hover:bg-slate-50/80"
                                                                }`}
                                                            >
                                                                <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
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
                                                                <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                                                    <div>
                                                                        <span className="block">{realInvoice}</span>
                                                                        <span className="text-[9px] text-slate-400">{item.deliveryNumber}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="py-2.5 px-3 text-slate-600 font-bold">
                                                                    {item.poNumber || "-"}
                                                                </td>
                                                                <td className="py-2.5 px-4 font-black text-slate-900 uppercase">
                                                                    {item.buyerName}
                                                                </td>
                                                                <td className="py-2.5 px-4 font-medium text-slate-800 uppercase">
                                                                    {item.productName}
                                                                </td>
                                                                <td className="py-2.5 px-3 text-right font-black text-slate-900 text-xs">
                                                                    {Number(item.quantity).toLocaleString("id-ID")}
                                                                </td>
                                                                <td className="py-2.5 px-3 text-center">
                                                                    {isAlreadyInEditingFleet ? (
                                                                        <span className="bg-indigo-100 text-indigo-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                                                                            Muatan Saat Ini
                                                                        </span>
                                                                    ) : (
                                                                        <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                                                                            Belum Muat
                                                                        </span>
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

                                {/* Floating / Sticky Checkout Bar (Like E-Commerce Cart Checkout) */}
                                {selectedItemIds.size > 0 && (
                                    <div className="fixed bottom-4 left-0 right-0 z-40 px-4">
                                        <div className="max-w-4xl mx-auto bg-slate-950 text-white p-4 rounded-2xl shadow-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4 animate-in slide-in-from-bottom-3 duration-200">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                                                    <Truck className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-black text-white flex items-center gap-2">
                                                        <span>{selectedItemIds.size} Baris Barang Dipilih</span>
                                                        <span className="text-slate-400 font-normal">•</span>
                                                        <span className="text-emerald-400">{selectedTotalQty.toLocaleString("id-ID")} Unit Muatan</span>
                                                    </div>
                                                    <p className="text-xs text-slate-400">
                                                        Target Kendaraan: <span className="font-bold text-amber-400">{selectedDriver || "(Belum Pilih Sopir)"}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setSelectedItemIds(new Set())}
                                                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-all cursor-pointer"
                                                >
                                                    Batalkan
                                                </button>
                                                <button
                                                    onClick={handleProceedToVerification}
                                                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer"
                                                >
                                                    <span>Lanjut ke Verifikasi Muatan</span>
                                                    <ArrowRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ------------------------------------------------------------- */}
                        {/* WIZARD STEP 2: VERIFIKASI & CEK FISIK BARANG (HALAMAN BARU)  */}
                        {/* ------------------------------------------------------------- */}
                        {wizardStep === 2 && (
                            <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-200">
                                {/* Header Card Step 2 */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">
                                                    TAHAP 2
                                                </span>
                                                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                                                    Verifikasi & Cek Fisik Muatan Kendaraan
                                                </h2>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Validasi fisik barang sebelum dinaikkan ke mobil. Pastikan seluruh produk, jumlah, dan tujuan sudah sesuai.
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setWizardStep(1)}
                                                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5"
                                            >
                                                <ArrowLeft className="w-4 h-4" />
                                                <span>Ubah Pilihan Muatan</span>
                                            </button>
                                            <button
                                                onClick={handleConfirmLoading}
                                                disabled={isSaving}
                                                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black px-5 py-2 rounded-xl text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-2 cursor-pointer"
                                            >
                                                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                                <span>Konfirmasi Pemuatan & Terbitkan Surat Muatan ✓</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Prominent Vehicle Summary Badges */}
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
                                        <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl">
                                            <span className="text-[10px] font-black uppercase text-indigo-700 block">Sopir / Driver</span>
                                            <span className="text-sm font-black text-slate-950 uppercase mt-0.5 block truncate">
                                                🚚 {selectedDriver}
                                            </span>
                                        </div>
                                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                            <span className="text-[10px] font-black uppercase text-slate-500 block">No. Polisi / Kendaraan</span>
                                            <span className="text-sm font-black text-slate-900 uppercase mt-0.5 block">
                                                {selectedVehiclePlate || "- (Truk Toko)"}
                                            </span>
                                        </div>
                                        <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl">
                                            <span className="text-[10px] font-black uppercase text-blue-700 block">Kartu E-Toll</span>
                                            <span className="text-xs font-mono font-black text-blue-900 mt-0.5 block truncate">
                                                {selectedEtoll || getFleetByDriverOrPlate(selectedDriver)?.etoll || "-"}
                                            </span>
                                        </div>
                                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                            <span className="text-[10px] font-black uppercase text-slate-500 block">Total Drop / Tujuan</span>
                                            <span className="text-sm font-black text-slate-900 mt-0.5 block">
                                                {selectedUniqueDeliveries} Surat Jalan
                                            </span>
                                        </div>
                                        <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                                            <span className="text-[10px] font-black uppercase text-emerald-700 block">Total Muatan Fisik</span>
                                            <span className="text-sm font-black text-emerald-800 mt-0.5 block">
                                                {selectedTotalQty.toLocaleString("id-ID")} Unit
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Verification Items Table */}
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="p-4 bg-slate-50 border-b border-slate-200">
                                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                                            Daftar Barang yang Dimuat ke Mobil {selectedDriver}:
                                        </h3>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black uppercase tracking-wider text-[11px]">
                                                    <th className="py-3 px-3 w-10 text-center">NO</th>
                                                    <th className="py-3 px-3 w-36">NO. FAKTUR</th>
                                                    <th className="py-3 px-3 w-32">NO. PO</th>
                                                    <th className="py-3 px-4 w-48">BUYER / CUSTOMER</th>
                                                    <th className="py-3 px-4">NAMA PRODUK</th>
                                                    <th className="py-3 px-3 w-24 text-right">QTY MUAT</th>
                                                    <th className="py-3 px-4 w-28 text-center">CEK FISIK GUDANG</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {selectedItemsForVerification.map((item, index) => {
                                                    const realInvoice = getRealisticInvoiceNumber(item, index);
                                                    const isChecked = Boolean(physicalChecklist[item.id]);

                                                    return (
                                                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                                            <td className="py-2.5 px-3 text-center text-slate-400 font-bold">
                                                                {index + 1}
                                                            </td>
                                                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                                                <div>
                                                                    <span className="block font-black text-indigo-700">{realInvoice}</span>
                                                                    <span className="text-[9px] text-slate-400">{item.deliveryNumber}</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-2.5 px-3 text-slate-600 font-semibold">
                                                                {item.poNumber || "-"}
                                                            </td>
                                                            <td className="py-2.5 px-4 font-black text-slate-900 uppercase">
                                                                {item.buyerName}
                                                            </td>
                                                            <td className="py-2.5 px-4 font-medium text-slate-800 uppercase">
                                                                {item.productName}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-right font-black text-slate-900 text-xs">
                                                                {Number(item.quantity).toLocaleString("id-ID")}
                                                            </td>
                                                            <td className="py-2.5 px-4 text-center">
                                                                <button
                                                                    onClick={() => setPhysicalChecklist(p => ({ ...p, [item.id]: !p[item.id] }))}
                                                                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer flex items-center gap-1 mx-auto ${
                                                                        isChecked 
                                                                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                                                                            : "bg-slate-100 text-slate-500 border border-slate-200"
                                                                    }`}
                                                                >
                                                                    {isChecked ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
                                                                    <span>{isChecked ? "Sesuai" : "Belum"}</span>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot>
                                                <tr className="bg-slate-100 font-black text-xs">
                                                    <td colSpan={5} className="py-3 px-4 text-right uppercase">
                                                        Total Muatan Mobil {selectedDriver}:
                                                    </td>
                                                    <td className="py-3 px-3 text-right text-indigo-700 font-black text-sm">
                                                        {selectedTotalQty.toLocaleString("id-ID")}
                                                    </td>
                                                    <td className="py-3 px-4 text-center text-[10px] text-slate-500">
                                                        Unit / Koli
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>

                                    {/* Confirmation Footer */}
                                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                                        <span className="text-xs text-slate-500">
                                            Klik tombol konfirmasi untuk menerbitkan Surat Muatan Kendaraan resmi dan mengupdate sistem.
                                        </span>
                                        <button
                                            onClick={handleConfirmLoading}
                                            disabled={isSaving}
                                            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-2 cursor-pointer"
                                        >
                                            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                            <span>Konfirmasi Pemuatan & Terbitkan Surat Muatan ✓</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ------------------------------------------------------------- */}
                        {/* WIZARD STEP 3: FORM SURAT MUATAN KENDARAAN (PRINT READY)      */}
                        {/* ------------------------------------------------------------- */}
                        {wizardStep === 3 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                {/* Success Banner & Actions Bar (No-Print) */}
                                <div className="no-print bg-emerald-950 text-white p-5 rounded-2xl border border-emerald-800 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black">
                                            <CheckCircle2 className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm sm:text-base font-black text-white">
                                                Pemuatan Armada {lastCompletedDriver || selectedDriver} Selesai & Tervalidasi!
                                            </h3>
                                            <p className="text-xs text-emerald-300 mt-0.5">
                                                Barang-barang ini telah dipindahkan ke status <span className="font-bold underline">DIMUAT</span> dan sudah tidak muncul lagi di antrian muat.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            onClick={() => window.print()}
                                            className="bg-white hover:bg-slate-100 text-slate-950 font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <Printer className="w-4 h-4 text-indigo-600" />
                                            <span>Cetak Form {lastCompletedDriver || selectedDriver}</span>
                                        </button>
                                        <button
                                            onClick={handleStartNextVehicle}
                                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span>Muat Kendaraan Berikutnya (+)</span>
                                        </button>
                                    </div>
                                </div>

                                {/* THE PRINTABLE VEHICLE LOADING MANIFEST FORM */}
                                <div className="bg-white border border-slate-300 rounded-xl shadow-xl p-6 sm:p-9 max-w-[210mm] mx-auto">
                                    {/* Header Manifest */}
                                    <div className="border-b-2 border-slate-900 pb-3">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex items-center gap-3.5">
                                                <div className="h-13 w-13 shrink-0 flex items-center justify-center p-1 bg-white border border-slate-200 rounded-lg">
                                                    <img 
                                                        src="/image/logokoboi.png" 
                                                        alt="Logo PT. Kola Borasi Indonesia" 
                                                        className="h-11 w-auto object-contain"
                                                        onError={(e) => {
                                                            (e.target as any).src = "/logo.png";
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h2 className="text-base sm:text-lg font-black text-slate-950 uppercase tracking-tight leading-tight">
                                                            PT. KOLA BORASI INDONESIA
                                                        </h2>
                                                        <span className="text-[7.5px] font-black bg-slate-900 text-white px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                            DISTRIBUSI
                                                        </span>
                                                    </div>
                                                    <p className="text-[9.5px] text-slate-700 font-bold tracking-wider uppercase mt-0.5">
                                                        Logistik Gudang & Distribusi Pengiriman Terpadu
                                                    </p>
                                                    <p className="text-[8px] text-slate-500 font-medium">
                                                        Jl. Arjuna IV Green Kartika Residence Blok EE NO.2, CIBINONG, KAB. BOGOR
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className="inline-block px-3 py-1 rounded text-xs font-black uppercase tracking-wider bg-slate-900 text-white">
                                                    SURAT MUATAN KENDARAAN (LOADING MANIFEST)
                                                </span>
                                                <p className="text-[10px] font-mono text-slate-500 mt-1 font-bold">
                                                    TANGGAL: {dateFormattedIndo}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Prominent Info Box */}
                                        <div className="grid grid-cols-5 gap-2 text-[10px] bg-slate-100/90 p-2.5 rounded border border-slate-300 mt-3">
                                            <div>
                                                <span className="text-slate-500 block uppercase font-bold text-[9px]">Sopir / Driver:</span>
                                                <span className="font-black text-slate-950 text-xs sm:text-sm uppercase tracking-wide truncate block">
                                                    🚚 {lastCompletedDriver || selectedDriver}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-slate-500 block uppercase font-bold text-[9px]">No. Polisi / Kendaraan:</span>
                                                <span className="font-black text-slate-900 uppercase block">
                                                    {selectedVehiclePlate || getFleetByDriverOrPlate(lastCompletedDriver || selectedDriver)?.plate || "- (Truk Toko)"}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-slate-500 block uppercase font-bold text-[9px]">No. Kartu E-Toll:</span>
                                                <span className="font-mono font-bold text-slate-900 text-[9.5px] block truncate">
                                                    {selectedEtoll || getFleetByDriverOrPlate(lastCompletedDriver || selectedDriver)?.etoll || "-"}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-slate-500 block uppercase font-bold text-[9px]">Total Surat Jalan (Drop):</span>
                                                <span className="font-black text-slate-900 text-xs block">
                                                    {selectedUniqueDeliveries} Surat Jalan
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-slate-500 block uppercase font-bold text-[9px]">Total Fisik Muatan:</span>
                                                <span className="font-black text-blue-800 text-xs block">
                                                    {selectedTotalQty.toLocaleString("id-ID")} Unit
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

                                                    return selectedItemsForVerification.map((item, idx) => {
                                                        const isFirstOfDeliv = item.isManual || item.deliveryId !== lastDelivId;
                                                        if (isFirstOfDeliv) {
                                                            deliveryIndex++;
                                                        }
                                                        if (!item.isManual && item.deliveryId) {
                                                            lastDelivId = item.deliveryId;
                                                        }

                                                        const realInvoice = getRealisticInvoiceNumber(item, idx);

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
                                                                            <span className="block font-black">{realInvoice}</span>
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
                                                                <td className="border border-slate-400 py-1 px-1 text-center">
                                                                    <div className="w-3.5 h-3.5 border border-slate-600 mx-auto rounded-xs flex items-center justify-center font-bold text-[8px]">
                                                                        ✓
                                                                    </div>
                                                                </td>
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
                                                        {selectedTotalQty.toLocaleString("id-ID")}
                                                    </td>
                                                    <td colSpan={2} className="border border-slate-400 py-1.5 px-2 text-center text-[8.5px] text-slate-500">
                                                        Unit / Koli
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>

                                    {/* Signatures 3-Way Accountability */}
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
                                                    ( {lastCompletedDriver || selectedDriver} )
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
                            </div>
                        )}
                    </div>
                )}

                {/* ========================================================================= */}
                {/* VIEW 2: RIWAYAT ARMADA SUDAH DIMUAT (COMPLETED FLEET)                     */}
                {/* ========================================================================= */}
                {mainView === "FLEET_HISTORY" && (
                    <div className="space-y-6">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                                    <ClipboardCheck className="w-5 h-5 text-indigo-600" />
                                    <span>Armada Kendaraan yang Sudah Selesai Dimuat</span>
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Daftar kendaraan yang telah selesai dimuat dan siap berangkat pada tanggal {dateFormattedIndo}.
                                </p>
                            </div>

                            <button
                                onClick={handleStartNextVehicle}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Muat Kendaraan Baru</span>
                            </button>
                        </div>

                        {loadedByDriver.size === 0 ? (
                            <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl p-6">
                                <Truck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                                <h4 className="text-base font-bold text-slate-700">Belum ada armada yang selesai dimuat hari ini</h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    Silakan gunakan menu &quot;Proses Pemuatan Kendaraan&quot; untuk mulai memuat barang ke mobil.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {Array.from(loadedByDriver.entries()).map(([drvName, drvItems]) => {
                                    const totalDriverQty = drvItems.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);
                                    const totalDriverSJ = new Set(drvItems.map(i => i.deliveryId || i.id)).size;
                                    const fleetInfo = getFleetByDriverOrPlate(drvName);

                                    return (
                                        <div key={drvName} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between items-start pb-3 border-b border-slate-100">
                                                    <div>
                                                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                                                            <span>🚚 ARMADA:</span>
                                                            <span className="text-indigo-600 font-black">{drvName}</span>
                                                        </h3>
                                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                                            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-mono font-bold text-slate-700">
                                                                {fleetInfo?.plate || "Truk Toko"}
                                                            </span>
                                                            {fleetInfo?.etoll && (
                                                                <span className="text-[9.5px] bg-blue-50 text-blue-800 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                                                                    <CreditCard className="w-3 h-3 text-blue-600" />
                                                                    <span>{fleetInfo.etoll}</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 mt-1 uppercase">
                                                            {totalDriverSJ} Surat Jalan • {drvItems.length} Baris Produk
                                                        </p>
                                                    </div>
                                                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
                                                        Siap Berangkat
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2 my-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                                    <div>
                                                        <span className="text-[10px] text-slate-400 block font-bold">TOTAL MUATAN:</span>
                                                        <span className="font-black text-blue-800 text-sm">{totalDriverQty.toLocaleString("id-ID")} Unit</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] text-slate-400 block font-bold">CUSTOMER TUJUAN:</span>
                                                        <span className="font-bold text-slate-800 truncate block">
                                                            {Array.from(new Set(drvItems.map(i => i.buyerName))).slice(0, 2).join(", ")}
                                                            {new Set(drvItems.map(i => i.buyerName)).size > 2 ? "..." : ""}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                                                <button
                                                    onClick={() => handleUnloadVehicle(drvName)}
                                                    disabled={unloadingDriver === drvName}
                                                    className="text-rose-600 hover:text-rose-700 disabled:opacity-50 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-rose-50"
                                                    title="Batalkan seluruh muatan dan kembalikan ke antrian gudang"
                                                >
                                                    {unloadingDriver === drvName ? (
                                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <RotateCcw className="w-3.5 h-3.5" />
                                                    )}
                                                    <span>{unloadingDriver === drvName ? "Membatalkan..." : "Batalkan Muat"}</span>
                                                </button>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleEditVehicleLoad(drvName)}
                                                        className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold px-3 py-1.5 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                                        title="Ubah atau tambah/kurang barang muatan armada ini"
                                                    >
                                                        <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                                                        <span>Edit Muatan</span>
                                                    </button>

                                                    <button
                                                        onClick={() => {
                                                            const targetItemIds = new Set(drvItems.map(i => i.id));
                                                            setSelectedItemIds(targetItemIds);
                                                            setSelectedDriver(drvName);
                                                            setSelectedVehiclePlate(fleetInfo?.plate || "");
                                                            setSelectedEtoll(fleetInfo?.etoll || "");
                                                            setLastCompletedDriver(drvName);
                                                            setMainView("WIZARD");
                                                            setWizardStep(3);
                                                        }}
                                                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-3.5 py-1.5 rounded-xl text-xs uppercase tracking-wider shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                                    >
                                                        <Printer className="w-3.5 h-3.5" />
                                                        <span>Lihat / Cetak Form</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ========================================================================= */}
                {/* VIEW 3: REKAP GABUNGAN SEMUA PENGIRIMAN (FULL RECAP TABLE)                */}
                {/* ========================================================================= */}
                {mainView === "FULL_RECAP" && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                                    Rekapitulasi Seluruh Pengiriman Harian (Kantor)
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Seluruh transaksi pengiriman tanggal {dateFormattedIndo} untuk arsip logistik dan administrasi kantor.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => window.print()}
                                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Printer className="w-4 h-4" />
                                    <span>Cetak Rekap Kantor</span>
                                </button>
                            </div>
                        </div>

                        {/* Printable Header for Full Recap */}
                        <div className="hidden print:flex items-center justify-between border-b-2 border-slate-900 pb-3 p-5">
                            <div className="flex items-center gap-3">
                                <img 
                                    src="/image/logokoboi.png" 
                                    alt="Logo PT. Kola Borasi Indonesia" 
                                    className="h-10 w-auto object-contain"
                                    onError={(e) => {
                                        (e.target as any).src = "/logo.png";
                                    }}
                                />
                                <div>
                                    <h2 className="text-sm font-black text-slate-950 uppercase">PT. KOLA BORASI INDONESIA</h2>
                                    <p className="text-[9px] text-slate-600 font-bold uppercase">Rekapitulasi Seluruh Pengiriman Harian (Kantor)</p>
                                    <p className="text-[8px] text-slate-400">Tanggal: {dateFormattedIndo}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Arsip Logistik</span>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black uppercase tracking-wider text-[11px]">
                                        <th className="py-3 px-3 w-8 text-center">NO</th>
                                        <th className="py-3 px-3 w-32">NO. FAKTUR</th>
                                        <th className="py-3 px-3 w-28">NO. PO</th>
                                        <th className="py-3 px-4 w-44">BUYER / CUSTOMER</th>
                                        <th className="py-3 px-4">NAMA PRODUK</th>
                                        <th className="py-3 px-3 w-16 text-right">QTY</th>
                                        <th className="py-3 px-4 w-32">DRIVER / KENDARAAN</th>
                                        <th className="py-3 px-3 w-24 text-center">STATUS</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {items.map((item, index) => {
                                        const realInvoice = getRealisticInvoiceNumber(item, index);
                                        const isLoaded = item.driver && item.driver.trim() && item.driver !== "PILIH DRIVER" && item.driver !== "-";

                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="py-2.5 px-3 text-center text-slate-400 font-bold">
                                                    {index + 1}
                                                </td>
                                                <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                                    <div>
                                                        <span className="block">{realInvoice}</span>
                                                        <span className="text-[9px] text-slate-400 font-mono">{item.deliveryNumber}</span>
                                                    </div>
                                                </td>
                                                <td className="py-2.5 px-3 text-slate-600 font-semibold">
                                                    {item.poNumber || "-"}
                                                </td>
                                                <td className="py-2.5 px-4 font-black text-slate-900 uppercase">
                                                    {item.buyerName}
                                                </td>
                                                <td className="py-2.5 px-4 font-medium text-slate-800 uppercase">
                                                    {item.productName}
                                                </td>
                                                <td className="py-2.5 px-3 text-right font-black text-slate-900 text-xs">
                                                    {Number(item.quantity).toLocaleString("id-ID")}
                                                </td>
                                                <td className="py-2.5 px-4 font-black text-indigo-700 uppercase">
                                                    {isLoaded ? `🚚 ${item.driver}` : "-"}
                                                </td>
                                                <td className="py-2.5 px-3 text-center">
                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                                                        isLoaded ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                                                    }`}>
                                                        {isLoaded ? "Dimuat" : "Antri"}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

            {/* Modal: Tambah Sopir / Armada Baru */}
            {showAddDriverModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                                <Truck className="h-4 w-4 text-indigo-600" />
                                <span>Tambah Sopir / Armada Baru</span>
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
                                        setSelectedDriver(val);
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
