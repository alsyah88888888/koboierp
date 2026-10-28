"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import { format, addDays, subDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { 
    Calendar, Printer, Download, Plus, Trash2, Save, 
    Truck, ArrowLeft, RefreshCw, CheckCircle2, AlertCircle,
    Eye, Edit3, ShieldAlert, FileText, CheckSquare, Square, Layers, X, 
    UserCheck, ArrowRight, RotateCcw, ListFilter, ClipboardCheck, History,
    CreditCard, Check, Package, Store, FileSpreadsheet, ChevronDown, Sparkles
} from "lucide-react";
import Link from "next/link";
import { callAction } from "@/proxy";
import * as XLSX from "xlsx";
import { OFFICIAL_FLEET, getFleetByDriverOrPlate } from "@/lib/fleet";
import { generateProfessionalLogisticsExcel } from "@/lib/excelExportLogistics";

interface ScheduleItem {
    id: string; // unique row id
    mappingId?: string;
    deliveryId?: string; // present if tied to salesDelivery
    deliveryItemId?: string; // present if tied to salesDeliveryItem
    receiptId?: string; // present if tied to goodsReceipt (Inbound Pickup PO)
    activityType: "DELIVERY" | "PICKUP";
    deliveryNumber?: string;
    invoiceNumber?: string;
    taxType: "KB-TRN" | "KB-TRD";
    poNumber: string;
    buyerName: string; // Customer name OR Vendor name
    productName: string;
    quantity: number;
    originalQuantity?: number; // original quantity before splitting
    remainderCancelled?: boolean; // if true, remainder won't be queued
    isRemainder?: boolean;
    driver: string;
    vehiclePlate?: string;
    etollCard?: string;
    isManual?: boolean;
}

interface ShippingScheduleDashboardProps {
    initialDate: string;
    initialDeliveries: any[];
    initialPickups?: any[];
    initialMappings?: any[];
    customerList?: string[];
    vendorList?: string[];
    productList?: string[];
    currentUser: any;
}

const COMMON_DRIVERS = [
    "KARNO",
    "KUSWARA",
    "RAHMAT. H",
    "CARSIKA",
    "HERU",
    "TIYO",
    "EKSPEDISI",
    "AMBIL SENDIRI (SELF PICKUP)"
];

export function ShippingScheduleDashboard({
    initialDate,
    initialDeliveries,
    initialPickups = [],
    initialMappings = [],
    customerList = [],
    vendorList = [],
    productList = [],
    currentUser
}: ShippingScheduleDashboardProps) {
    const [selectedDate, setSelectedDate] = useState<string>(initialDate);
    const [deliveries, setDeliveries] = useState<any[]>(initialDeliveries);
    const [pickups, setPickups] = useState<any[]>(initialPickups);
    const [items, setItems] = useState<ScheduleItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
    const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
    const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);

    // Activity Filter: "ALL" | "DELIVERY" | "PICKUP"
    const [activityFilter, setActivityFilter] = useState<"ALL" | "DELIVERY" | "PICKUP">("ALL");

    // Modal state for manually scheduling supplier pickup (PO Pembelian)
    const [showAddPickupModal, setShowAddPickupModal] = useState<boolean>(false);
    const [newPickupVendor, setNewPickupVendor] = useState<string>("");
    const [newPickupPo, setNewPickupPo] = useState<string>("");
    const [newPickupProduct, setNewPickupProduct] = useState<string>("");
    const [newPickupQty, setNewPickupQty] = useState<number>(100);

    // Main View Navigation: "WIZARD" (Proses Muat Baru), "FLEET_HISTORY" (Armada Selesai Dimuat), "FULL_RECAP" (Rekap Gabungan Harian)
    const [mainView, setMainView] = useState<"WIZARD" | "FLEET_HISTORY" | "FULL_RECAP">("WIZARD");

    // E-Commerce Style 3-Step Wizard:
    // Step 1: SELECT (Pilih Muatan & Tentukan Sopir/Kendaraan)
    // Step 2: VERIFY (Halaman Verifikasi & Cek Fisik Barang)
    // Step 3: PRINT (Cetak Form Validasi Surat Muatan Kendaraan)
    const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);

    // Wizard Form States
    const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
    const [selectedDriver, setSelectedDriver] = useState<string>("");
    const [selectedVehiclePlate, setSelectedVehiclePlate] = useState<string>("");
    const [selectedEtoll, setSelectedEtoll] = useState<string>("");

    // Toggle driver selection with support for up to 2 drivers (Utama & Pendamping)
    const handleToggleDriverCard = (driverName: string) => {
        const upper = driverName.trim().toUpperCase();

        // 1. Handling LOCO / AMBIL SENDIRI (Self Pickup)
        if (upper === "AMBIL SENDIRI" || upper.includes("SELF PICKUP")) {
            if (selectedDrivers.includes("AMBIL SENDIRI")) {
                setSelectedDrivers([]);
                setSelectedDriver("");
                setSelectedVehiclePlate("");
                setSelectedEtoll("");
            } else {
                setSelectedDrivers(["AMBIL SENDIRI"]);
                setSelectedDriver("AMBIL SENDIRI");
                setSelectedVehiclePlate("MOBIL SENDIRI");
                setSelectedEtoll("");
            }
            return;
        }

        // 2. Handling EKSPEDISI (Vendor Pihak Ketiga)
        if (upper === "EKSPEDISI") {
            if (selectedDrivers.includes("EKSPEDISI")) {
                const next = selectedDrivers.filter(d => d !== "EKSPEDISI");
                setSelectedDrivers(next);
                setSelectedDriver(next.join(" & "));
                if (next.length === 1) {
                    const fleet = getFleetByDriverOrPlate(next[0]);
                    if (fleet) {
                        setSelectedVehiclePlate(fleet.plate);
                        setSelectedEtoll(fleet.etoll);
                    }
                } else if (next.length === 0) {
                    setSelectedVehiclePlate("");
                    setSelectedEtoll("");
                }
            } else {
                const filtered = selectedDrivers.filter(d => d !== "AMBIL SENDIRI");
                let next: string[];
                if (filtered.length === 0) {
                    next = ["EKSPEDISI"];
                    setSelectedVehiclePlate("");
                    setSelectedEtoll("");
                } else {
                    next = [filtered[0], "EKSPEDISI"];
                }
                setSelectedDrivers(next);
                setSelectedDriver(next.join(" & "));
            }
            return;
        }

        // 3. Official Company Fleet & Custom Drivers
        const filtered = selectedDrivers.filter(d => d !== "AMBIL SENDIRI");
        const isAlreadySelected = filtered.includes(upper);

        if (isAlreadySelected) {
            // Deselect driver
            const next = filtered.filter(d => d !== upper);
            setSelectedDrivers(next);
            setSelectedDriver(next.join(" & "));
            if (next.length === 1) {
                const fleet = getFleetByDriverOrPlate(next[0]);
                if (fleet) {
                    setSelectedVehiclePlate(fleet.plate);
                    setSelectedEtoll(fleet.etoll);
                }
            } else if (next.length === 0) {
                setSelectedVehiclePlate("");
                setSelectedEtoll("");
            }
        } else {
            // Select driver
            const fleet = getFleetByDriverOrPlate(upper);
            let next: string[];
            if (filtered.length === 0) {
                // First driver (Sopir 1 - Utama)
                next = [upper];
                if (fleet) {
                    setSelectedVehiclePlate(fleet.plate);
                    setSelectedEtoll(fleet.etoll);
                }
            } else if (filtered.length === 1) {
                // Second driver (Sopir 2 - Pendamping/Cadangan)
                next = [filtered[0], upper];
                // Keep Driver 1's truck plate active by default; if empty, use Driver 2's
                if (!selectedVehiclePlate && fleet) {
                    setSelectedVehiclePlate(fleet.plate);
                    setSelectedEtoll(fleet.etoll);
                }
            } else {
                // Already 2 drivers: replace Sopir 2 with clicked driver
                next = [filtered[0], upper];
            }
            setSelectedDrivers(next);
            setSelectedDriver(next.join(" & "));
        }
    };

    const handleDriverSelect = (driverVal: string) => {
        const upper = driverVal.toUpperCase();
        setSelectedDriver(upper);
        const parts = upper
            .split(/[&/,+]+/)
            .map(s => s.trim())
            .filter(Boolean);
        setSelectedDrivers(parts);

        if (parts.length === 1) {
            const fleet = getFleetByDriverOrPlate(parts[0]);
            if (fleet) {
                setSelectedVehiclePlate(fleet.plate);
                setSelectedEtoll(fleet.etoll);
            } else {
                if (parts[0] === "EKSPEDISI") {
                    setSelectedVehiclePlate("");
                } else if (parts[0].includes("AMBIL SENDIRI") || parts[0].includes("SELF PICKUP")) {
                    if (!selectedVehiclePlate || OFFICIAL_FLEET.some(f => f.plate === selectedVehiclePlate)) {
                        setSelectedVehiclePlate("MOBIL SENDIRI");
                    }
                } else if (!selectedVehiclePlate || OFFICIAL_FLEET.some(f => f.plate === selectedVehiclePlate)) {
                    setSelectedVehiclePlate("");
                }
                setSelectedEtoll("");
            }
        } else if (parts.length >= 2) {
            if (!selectedVehiclePlate) {
                const fleet1 = getFleetByDriverOrPlate(parts[0]);
                if (fleet1) {
                    setSelectedVehiclePlate(fleet1.plate);
                    setSelectedEtoll(fleet1.etoll);
                }
            }
        } else {
            setSelectedVehiclePlate("");
            setSelectedEtoll("");
        }
    };

    const handlePlateSelect = (plateVal: string) => {
        const upper = plateVal.toUpperCase();
        setSelectedVehiclePlate(upper);
        const fleet = getFleetByDriverOrPlate(upper);
        if (fleet) {
            if (!selectedDriver || selectedDriver === "EKSPEDISI") {
                setSelectedDriver(fleet.driver);
                setSelectedDrivers([fleet.driver]);
            }
            setSelectedEtoll(fleet.etoll);
        } else {
            // Manual custom plate typed by user (e.g. rental truck, third party ekspedisi)
            // If the current etoll was from an official fleet driver, clear it so it doesn't show wrong card!
            if (OFFICIAL_FLEET.some(f => f.etoll === selectedEtoll)) {
                setSelectedEtoll("");
            }
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
    const buildItemsFromDeliveries = (delivs: any[], currentMappings: any[] = []): ScheduleItem[] => {
        const rows: ScheduleItem[] = [];
        delivs.forEach((d, dIdx) => {
            const po = d.poNumber || "-";
            const buyer = d.buyerName || "-";
            const rawVehicle = (d.driver || d.vehicleNumber || "").trim();
            const isCompound = rawVehicle.includes("&") || rawVehicle.includes("+");
            const fleet = !isCompound ? getFleetByDriverOrPlate(rawVehicle) : undefined;
            let driverName = isCompound ? rawVehicle : (fleet?.driver || rawVehicle);
            let vehiclePlate = fleet?.plate || "";
            let etollCard = fleet?.etoll || "";

            // Check if saved as "DRIVER (PLATE)"
            if (rawVehicle) {
                const matchParen = rawVehicle.match(/^([^(]+)\s*\(([^)]+)\)$/);
                if (matchParen) {
                    driverName = matchParen[1].trim().toUpperCase();
                    vehiclePlate = matchParen[2].trim().toUpperCase();
                    const matchedFleet = getFleetByDriverOrPlate(vehiclePlate);
                    if (matchedFleet) etollCard = matchedFleet.etoll;
                } else if (!fleet) {
                    const matchDash = rawVehicle.match(/^([^-]+)\s*-\s*(.+)$/);
                    if (matchDash && !matchDash[1].toUpperCase().startsWith("KB-")) {
                        driverName = matchDash[1].trim().toUpperCase();
                        vehiclePlate = matchDash[2].trim().toUpperCase();
                    } else if (isCompound) {
                        const parts = rawVehicle.split(/[&+,]/).map((s: string) => s.trim().toUpperCase()).filter(Boolean);
                        for (const p of parts) {
                            const matchedFleet = getFleetByDriverOrPlate(p);
                            if (matchedFleet) {
                                vehiclePlate = matchedFleet.plate;
                                etollCard = matchedFleet.etoll;
                                break;
                            }
                        }
                    }
                }
            }

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
                    activityType: "DELIVERY",
                    deliveryNumber: d.deliveryNumber,
                    invoiceNumber: inv,
                    taxType: taxType,
                    poNumber: po,
                    buyerName: buyer,
                    productName: "-",
                    quantity: 0,
                    originalQuantity: 0,
                    driver: driverName,
                    vehiclePlate: vehiclePlate,
                    etollCard: etollCard,
                    isManual: false
                });
            } else {
                delivItems.forEach((it: any, idx: number) => {
                    const qty = Number(it.quantity || 0);
                    const itId = it.id || String(idx);

                    // Check if this item has split mappings stored in ShippingMapping
                    const splitMaps = currentMappings.filter(m => 
                        m.notes && m.notes.includes(`SPLIT:${d.id}:${itId}`)
                    );

                    if (splitMaps.length > 0) {
                        splitMaps.forEach((sm, sIdx) => {
                            const origMatch = sm.notes?.match(/ORIG:(\d+)/);
                            const origQty = origMatch ? parseInt(origMatch[1], 10) : qty;
                            const isCancelled = Boolean(sm.notes?.includes("CANCELLED"));
                            const isRem = Boolean(sm.notes?.includes("REMAINDER"));
                            const smDriver = (sm.driver || "").trim();
                            const smFleet = smDriver ? getFleetByDriverOrPlate(smDriver) : undefined;

                            rows.push({
                                id: sm.id || `${d.id}-${itId}-split-${sIdx}`,
                                mappingId: sm.id,
                                deliveryId: d.id,
                                deliveryItemId: itId,
                                activityType: "DELIVERY",
                                deliveryNumber: d.deliveryNumber,
                                invoiceNumber: inv,
                                taxType: taxType,
                                poNumber: sm.poNumber || po,
                                buyerName: sm.buyerName || buyer,
                                productName: sm.productName || it.productName || it.product?.name || "Item",
                                quantity: Number(sm.quantity || 0),
                                originalQuantity: origQty,
                                driver: smDriver,
                                vehiclePlate: smFleet?.plate || "",
                                etollCard: smFleet?.etoll || "",
                                remainderCancelled: isCancelled,
                                isRemainder: isRem,
                                isManual: false
                            });
                        });
                    } else {
                        rows.push({
                            id: `${d.id}-${itId}`,
                            deliveryId: d.id,
                            deliveryItemId: itId,
                            activityType: "DELIVERY",
                            deliveryNumber: d.deliveryNumber,
                            invoiceNumber: inv,
                            taxType: taxType,
                            poNumber: po,
                            buyerName: buyer,
                            productName: it.productName || it.product?.name || "Item",
                            quantity: qty,
                            originalQuantity: qty,
                            driver: driverName,
                            vehiclePlate: vehiclePlate,
                            etollCard: etollCard,
                            isManual: false
                        });
                    }
                });
            }
        });
        return rows;
    };

    // Transform GoodsReceipt (Inbound PO Pickup) into schedule items
    const buildItemsFromPickups = (pickupReceipts: any[]): ScheduleItem[] => {
        const rows: ScheduleItem[] = [];
        pickupReceipts.forEach((r, rIdx) => {
            const po = r.poNumber || r.formNumber || "-";
            const vendor = r.vendorName || r.buyerName || "-";
            const rawVehicle = (r.driver || "").trim();
            const isCompound = rawVehicle.includes("&") || rawVehicle.includes("+");
            const fleet = !isCompound ? getFleetByDriverOrPlate(rawVehicle) : undefined;
            let driverName = isCompound ? rawVehicle : (fleet?.driver || rawVehicle);
            let vehiclePlate = fleet?.plate || "";
            let etollCard = fleet?.etoll || "";

            if (rawVehicle) {
                const matchParen = rawVehicle.match(/^([^(]+)\s*\(([^)]+)\)$/);
                if (matchParen) {
                    driverName = matchParen[1].trim().toUpperCase();
                    vehiclePlate = matchParen[2].trim().toUpperCase();
                    const matchedFleet = getFleetByDriverOrPlate(vehiclePlate);
                    if (matchedFleet) etollCard = matchedFleet.etoll;
                }
            }

            const dateCode = format(new Date(selectedDate), "ddMMyyyy");
            const inv = r.receiptNumber || `LPB-${dateCode}-${String(rIdx + 1).padStart(3, "0")}`;

            const rItems = r.items || [];
            if (rItems.length === 0) {
                rows.push({
                    id: `pu-${r.id}-empty`,
                    receiptId: r.id,
                    activityType: "PICKUP",
                    deliveryNumber: r.receiptNumber || "-",
                    invoiceNumber: inv,
                    taxType: "KB-TRD",
                    poNumber: po,
                    buyerName: vendor,
                    productName: "-",
                    quantity: 0,
                    originalQuantity: 0,
                    driver: driverName,
                    vehiclePlate: vehiclePlate,
                    etollCard: etollCard,
                    isManual: false
                });
            } else {
                rItems.forEach((it: any, idx: number) => {
                    const qty = Number(it.quantity || 0);
                    rows.push({
                        id: `pu-${r.id}-${it.id || idx}`,
                        receiptId: r.id,
                        activityType: "PICKUP",
                        deliveryNumber: r.receiptNumber || "-",
                        invoiceNumber: inv,
                        taxType: "KB-TRD",
                        poNumber: po,
                        buyerName: vendor,
                        productName: it.productName || it.product?.name || "Item",
                        quantity: qty,
                        originalQuantity: qty,
                        driver: driverName,
                        vehiclePlate: vehiclePlate,
                        etollCard: etollCard,
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
            const isPickup = m.category === "PICKUP";
            const taxType = (m.category === "KB-TRN" ? "KB-TRN" : "KB-TRD") as "KB-TRN" | "KB-TRD";
            const rawPo = (m.poNumber || "").trim();
            const isCategoryPo = rawPo.toUpperCase() === "NON PKP" || rawPo.toUpperCase() === "PKP";

            // Check if there is a matching real delivery for this buyer
            const matchedDeliv = delivs.find(d => 
                d.buyerName?.trim().toLowerCase() === m.buyerName?.trim().toLowerCase()
            );

            const realisticInv = matchedDeliv?.invoiceNumber?.trim() 
                ? matchedDeliv.invoiceNumber.trim() 
                : isPickup 
                    ? `LPB-${dateCode}-${String(idx + 1).padStart(3, "0")}`
                    : `${taxType}-${dateCode}-${String(idx + 1).padStart(3, "0")}`;

            const cleanPo = !isCategoryPo && rawPo ? rawPo : (matchedDeliv?.poNumber || "-");
            const rawVehicle = (m.driver || matchedDeliv?.driver || matchedDeliv?.vehicleNumber || "").trim();
            const isCompound = rawVehicle.includes("&") || rawVehicle.includes("+");
            const fleet = !isCompound ? getFleetByDriverOrPlate(rawVehicle) : undefined;
            let driverName = isCompound ? rawVehicle : (fleet?.driver || rawVehicle);
            let vehiclePlate = fleet?.plate || "";
            let etollCard = fleet?.etoll || "";

            if (rawVehicle) {
                const matchParen = rawVehicle.match(/^([^(]+)\s*\(([^)]+)\)$/);
                if (matchParen) {
                    driverName = matchParen[1].trim().toUpperCase();
                    vehiclePlate = matchParen[2].trim().toUpperCase();
                    const matchedFleet = getFleetByDriverOrPlate(vehiclePlate);
                    if (matchedFleet) etollCard = matchedFleet.etoll;
                } else if (!fleet && isCompound) {
                    const parts = rawVehicle.split(/[&+,]/).map((s: string) => s.trim().toUpperCase()).filter(Boolean);
                    for (const p of parts) {
                        const matchedFleet = getFleetByDriverOrPlate(p);
                        if (matchedFleet) {
                            vehiclePlate = matchedFleet.plate;
                            etollCard = matchedFleet.etoll;
                            break;
                        }
                    }
                }
            }

            const qty = Number(m.quantity || 0);

            return {
                id: m.id,
                deliveryId: matchedDeliv?.id,
                activityType: isPickup ? "PICKUP" : "DELIVERY",
                deliveryNumber: matchedDeliv?.deliveryNumber || (isPickup ? `LPB-${dateCode}-${String(idx + 1).padStart(3, "0")}` : `SJ-${dateCode}-${String(idx + 1).padStart(3, "0")}`),
                invoiceNumber: realisticInv,
                taxType: taxType,
                poNumber: cleanPo,
                buyerName: m.buyerName || "-",
                productName: m.productName || "-",
                quantity: qty,
                originalQuantity: qty,
                driver: driverName,
                vehiclePlate: vehiclePlate,
                etollCard: etollCard,
                isManual: !matchedDeliv
            };
        });
    };

    // Initialize items: prioritize real deliveries and real pickups, merging manual pickups cleanly
    useEffect(() => {
        const currentMaps = initialMappings || [];
        const deliveryRows = deliveries && deliveries.length > 0 
            ? buildItemsFromDeliveries(deliveries, currentMaps) 
            : (currentMaps.length > 0 
                ? buildItemsFromMappings(currentMaps.filter(m => m.category !== "PICKUP" && !m.notes?.includes("SPLIT:")), initialDeliveries || []) 
                : []);
        
        const pickupReceiptRows = pickups && pickups.length > 0 
            ? buildItemsFromPickups(pickups) 
            : [];
        const pickupManualRows = currentMaps.length > 0
            ? buildItemsFromMappings(currentMaps.filter(m => m.category === "PICKUP"), [])
            : [];
        const pickupRows = [...pickupReceiptRows, ...pickupManualRows];

        setItems([...deliveryRows, ...pickupRows]);
    }, [deliveries, pickups, initialMappings]);

    // Fetch deliveries, pickups, and mappings when selectedDate changes
    const fetchSchedule = async (dateStr: string) => {
        setIsLoading(true);
        try {
            const [delivRes, pickRes, mapRes] = await Promise.all([
                callAction("getDailyShippingSchedule", dateStr),
                callAction("getDailyPickupSchedule", dateStr),
                callAction("getShippingMappings", dateStr, "ALL")
            ]);

            const delivs = Array.isArray(delivRes) ? delivRes : [];
            const picks = Array.isArray(pickRes) ? pickRes : [];
            const maps = Array.isArray(mapRes) ? mapRes : [];

            setDeliveries(delivs);
            setPickups(picks);

            const deliveryRows = delivs.length > 0 
                ? buildItemsFromDeliveries(delivs, maps) 
                : buildItemsFromMappings(maps.filter(m => m.category !== "PICKUP" && !m.notes?.includes("SPLIT:")), delivs);
            
            const pickupReceiptRows = picks.length > 0 
                ? buildItemsFromPickups(picks) 
                : [];
            const pickupManualRows = buildItemsFromMappings(maps.filter(m => m.category === "PICKUP"), []);
            const pickupRows = [...pickupReceiptRows, ...pickupManualRows];

            setItems([...deliveryRows, ...pickupRows]);
        } catch (err) {
            console.error("Gagal memuat jadwal pengiriman dan pengambilan:", err);
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

    // Handler: Update quantity for partial truck loading (Option A: Split Muatan)
    const handleUpdateItemQuantity = (itemId: string, newQty: number) => {
        setItems(prev => prev.map(it => {
            if (it.id !== itemId) return it;
            const orig = it.originalQuantity ?? it.quantity;
            const validQty = Math.max(1, Math.min(newQty, orig));
            return {
                ...it,
                quantity: validQty,
                originalQuantity: orig,
                remainderCancelled: validQty === orig ? false : it.remainderCancelled
            };
        }));
    };

    // Handler: Cancel remainder units if rejected or cut order
    const handleCancelRemainder = async (itemId: string) => {
        setItems(prev => prev.map(it => {
            if (it.id !== itemId) return it;
            return {
                ...it,
                remainderCancelled: true
            };
        }));

        const target = items.find(i => i.id === itemId);
        if (target && target.deliveryId) {
            const orig = target.originalQuantity ?? target.quantity;
            const remainder = target.quantity;
            await callAction("saveSplitScheduleMapping", {
                dateStr: selectedDate,
                splits: [{
                    mappingId: target.mappingId,
                    deliveryId: target.deliveryId,
                    deliveryItemId: target.deliveryItemId || target.id,
                    category: target.taxType,
                    poNumber: target.poNumber,
                    buyerName: target.buyerName,
                    productName: target.productName,
                    quantity: remainder,
                    originalQuantity: orig,
                    driver: "",
                    isRemainder: true,
                    remainderCancelled: true
                }]
            }).catch(console.error);
        }
    };

    const allDriverOptions = useMemo(() => {
        const list = [...COMMON_DRIVERS];
        customDrivers.forEach(d => {
            const clean = d.trim().toUpperCase();
            if (clean && !list.includes(clean)) list.push(clean);
        });
        return list;
    }, [customDrivers]);

    const allPlateOptions = useMemo(() => {
        const set = new Set<string>();
        OFFICIAL_FLEET.forEach(f => set.add(f.plate));
        items.forEach(i => {
            if (i.vehiclePlate && i.vehiclePlate.trim()) set.add(i.vehiclePlate.trim().toUpperCase());
        });
        return Array.from(set);
    }, [items]);

    // SEPARATION OF QUEUES:
    // 1. selectableItems: Items that can be selected in Step 1.
    //    If editingDriver is set, includes unassigned items PLUS items belonging to editingDriver.
    //    If not editing, includes only unassigned items. Filtered by activityFilter & taxFilter.
    // 2. loadedQueue: Items that have been loaded into vehicles (shown in Completed Fleet)
    const selectableItems = useMemo(() => {
        return items.filter(item => {
            const drv = (item.driver || "").trim().toUpperCase();
            const isUnassigned = !drv || drv === "PILIH DRIVER" || drv === "-";
            const isBelongingToCurrentEdit = editingDriver && drv === editingDriver.toUpperCase();
            if (!isUnassigned && !isBelongingToCurrentEdit) return false;
            if (activityFilter !== "ALL" && item.activityType !== activityFilter) return false;
            if (taxFilter !== "ALL" && item.taxType !== taxFilter) return false;
            return true;
        });
    }, [items, activityFilter, taxFilter, editingDriver]);

    const unassignedItems = useMemo(() => {
        return items.filter(item => {
            const drv = (item.driver || "").trim().toUpperCase();
            const isUnassigned = !drv || drv === "PILIH DRIVER" || drv === "-";
            if (!isUnassigned) return false;
            return true;
        });
    }, [items]);

    const deliveryQueueCount = useMemo(() => {
        return unassignedItems.filter(i => i.activityType === "DELIVERY").length;
    }, [unassignedItems]);

    const pickupQueueCount = useMemo(() => {
        return unassignedItems.filter(i => i.activityType === "PICKUP").length;
    }, [unassignedItems]);

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

    const handleToggleSelectItem = (id: string) => {
        setSelectedItemIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Selected items for Step 2 Verification
    const selectedItemsForVerification = useMemo(() => {
        return items.filter(i => selectedItemIds.has(i.id));
    }, [items, selectedItemIds]);

    const selectedTotalQty = selectedItemsForVerification.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);
    const selectedUniqueDeliveries = new Set(selectedItemsForVerification.map(i => i.deliveryId || i.receiptId || i.id)).size;

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
        const parts = cleanDriver.split(/[&/,+]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
        const fleetInfo = parts.length === 1 ? getFleetByDriverOrPlate(cleanDriver) : undefined;
        const driverItems = items.filter(i => (i.driver || "").trim().toUpperCase() === cleanDriver);
        const targetItemIds = new Set(driverItems.map(i => i.id));

        const existingPlate = driverItems.find(i => i.vehiclePlate)?.vehiclePlate || fleetInfo?.plate || "";
        const existingEtoll = driverItems.find(i => i.etollCard)?.etollCard || fleetInfo?.etoll || "";

        setEditingDriver(cleanDriver);
        setSelectedDriver(cleanDriver);
        setSelectedDrivers(parts);
        setSelectedVehiclePlate(existingPlate);
        setSelectedEtoll(existingEtoll);
        setSelectedItemIds(targetItemIds);
        setMainView("WIZARD");
        setWizardStep(1);
    };

    // CONFIRM LOADING (Step 2 -> Step 3)
    // Saves driver to database and REMOVES items from the unassigned loading queue!
    // Option A: Split partial quantities stay in the unassigned queue for the next vehicle.
    const handleConfirmLoading = async () => {
        if (!selectedDriver.trim() || selectedItemIds.size === 0) return;
        setIsSaving(true);
        const upperDriver = selectedDriver.trim().toUpperCase();
        const cleanPlate = selectedVehiclePlate.trim().toUpperCase();
        const cleanEtoll = selectedEtoll.trim();
        const vehicleToStore = cleanPlate && upperDriver === "EKSPEDISI"
            ? `EKSPEDISI (${cleanPlate})`
            : upperDriver;

        try {
            const newlySelectedDelivIds = Array.from(new Set(selectedItemsForVerification.map(i => i.deliveryId).filter(Boolean))) as string[];
            const newlySelectedReceiptIds = Array.from(new Set(selectedItemsForVerification.map(i => i.receiptId).filter(Boolean))) as string[];

            // Find items that were previously assigned to this driver (or editingDriver) that are now REMOVED
            const prevDriverName = (editingDriver || selectedDriver).trim().toUpperCase();
            const previouslyLoadedItems = items.filter(i => (i.driver || "").trim().toUpperCase() === prevDriverName);
            const unselectedItems = previouslyLoadedItems.filter(i => !selectedItemIds.has(i.id));
            const removedDelivIds = Array.from(new Set(
                unselectedItems
                    .map(i => i.deliveryId)
                    .filter((dId): dId is string => typeof dId === "string" && dId.length > 0 && !newlySelectedDelivIds.includes(dId))
            ));
            const removedReceiptIds = Array.from(new Set(
                unselectedItems
                    .map(i => i.receiptId)
                    .filter((rId): rId is string => typeof rId === "string" && rId.length > 0 && !newlySelectedReceiptIds.includes(rId))
            ));

            // Option A: For items where QTY was reduced, create remainder items in unassigned queue
            const splitRemainderItems: ScheduleItem[] = [];
            const splitsToPersist: any[] = [];

            selectedItemsForVerification.forEach(it => {
                const orig = it.originalQuantity ?? it.quantity;
                if (it.quantity < orig) {
                    const remainder = orig - it.quantity;
                    const remainderId = `${it.id}-rem-${Date.now()}`;

                    if (!it.remainderCancelled) {
                        splitRemainderItems.push({
                            ...it,
                            id: remainderId,
                            quantity: remainder,
                            originalQuantity: remainder,
                            driver: "",
                            vehiclePlate: "",
                            etollCard: "",
                            remainderCancelled: false,
                            isRemainder: true
                        });
                    }

                    if (it.deliveryId) {
                        splitsToPersist.push({
                            mappingId: it.mappingId,
                            deliveryId: it.deliveryId,
                            deliveryItemId: it.deliveryItemId || it.id,
                            category: it.taxType,
                            poNumber: it.poNumber,
                            buyerName: it.buyerName,
                            productName: it.productName,
                            quantity: it.quantity,
                            originalQuantity: orig,
                            driver: vehicleToStore,
                            isRemainder: false
                        });
                        splitsToPersist.push({
                            deliveryId: it.deliveryId,
                            deliveryItemId: it.deliveryItemId || it.id,
                            category: it.taxType,
                            poNumber: it.poNumber,
                            buyerName: it.buyerName,
                            productName: it.productName,
                            quantity: remainder,
                            originalQuantity: orig,
                            driver: "",
                            isRemainder: true,
                            remainderCancelled: it.remainderCancelled
                        });
                    }
                } else if (it.isRemainder && it.deliveryId) {
                    splitsToPersist.push({
                        mappingId: it.mappingId,
                        deliveryId: it.deliveryId,
                        deliveryItemId: it.deliveryItemId || it.id,
                        category: it.taxType,
                        poNumber: it.poNumber,
                        buyerName: it.buyerName,
                        productName: it.productName,
                        quantity: it.quantity,
                        originalQuantity: it.originalQuantity || it.quantity,
                        driver: vehicleToStore,
                        isRemainder: true,
                        remainderCancelled: false
                    });
                }
            });

            // Update items locally - ONLY items with ID in selectedItemIds get assigned!
            setItems(prev => {
                const updated = prev.map(item => {
                    if (selectedItemIds.has(item.id)) {
                        return { 
                            ...item, 
                            driver: upperDriver,
                            vehiclePlate: cleanPlate,
                            etollCard: cleanEtoll
                        };
                    }
                    if ((item.driver || "").trim().toUpperCase() === prevDriverName) {
                        return { ...item, driver: "", vehiclePlate: "", etollCard: "" };
                    }
                    return item;
                });
                return [...updated, ...splitRemainderItems];
            });

            // Also update deliveries state locally
            setDeliveries(prev => prev.map(d => {
                if (newlySelectedDelivIds.includes(d.id)) {
                    return { ...d, driver: upperDriver, vehicleNumber: vehicleToStore };
                }
                if (removedDelivIds.includes(d.id)) {
                    return { ...d, driver: "", vehicleNumber: "" };
                }
                return d;
            }));

            // Also update pickups state locally
            setPickups(prev => prev.map(p => {
                if (newlySelectedReceiptIds.includes(p.id)) {
                    return { ...p, driver: upperDriver };
                }
                if (removedReceiptIds.includes(p.id)) {
                    return { ...p, driver: "" };
                }
                return p;
            }));

            // Save in database
            const updatePromises: Promise<any>[] = [];
            newlySelectedDelivIds.forEach(dId => {
                updatePromises.push(callAction("updateDeliveryDriver", dId, vehicleToStore).catch(console.error));
            });
            removedDelivIds.forEach(dId => {
                updatePromises.push(callAction("updateDeliveryDriver", dId, "").catch(console.error));
            });
            newlySelectedReceiptIds.forEach(rId => {
                updatePromises.push(callAction("updateReceiptDriver", rId, vehicleToStore).catch(console.error));
            });
            removedReceiptIds.forEach(rId => {
                updatePromises.push(callAction("updateReceiptDriver", rId, "").catch(console.error));
            });

            // Persist split allocations if any
            if (splitsToPersist.length > 0) {
                updatePromises.push(callAction("saveSplitScheduleMapping", {
                    dateStr: selectedDate,
                    splits: splitsToPersist
                }).catch(console.error));
            }

            // Persist driver on manual items if any
            const manualSelected = selectedItemsForVerification.filter(i => i.isManual);
            manualSelected.forEach(m => {
                updatePromises.push(callAction("updateShippingMappingDriver", m.id, vehicleToStore).catch(console.error));
            });

            await Promise.all(updatePromises);

            setLastCompletedDriver(upperDriver);
            setEditingDriver(null);
            setWizardStep(3);
            setSaveFeedback(`Penugasan muatan berhasil disimpan ke armada ${upperDriver}! Form manifest siap dicetak.`);
            setTimeout(() => setSaveFeedback(null), 6000);
        } catch (err: any) {
            console.error("Gagal menyimpan penugasan muatan:", err);
            alert("Gagal menyimpan pemuatan: " + (err.message || String(err)));
        } finally {
            setIsSaving(false);
        }
    };

    // Handler: Add custom supplier pickup schedule (Inbound Pickup PO)
    const handleAddNewPickup = async () => {
        if (!newPickupVendor.trim()) {
            alert("Silakan masukkan / pilih nama Supplier / Pabrik!");
            return;
        }
        if (!newPickupProduct.trim()) {
            alert("Silakan masukkan nama produk yang akan diambil!");
            return;
        }
        if (!newPickupQty || newPickupQty <= 0) {
            alert("Silakan masukkan QTY ambil yang valid (minimal 1)!");
            return;
        }

        setIsSaving(true);
        try {
            const created = await callAction("createManualPickupSchedule", {
                dateStr: selectedDate,
                poNumber: newPickupPo.trim(),
                vendorName: newPickupVendor.trim(),
                productName: newPickupProduct.trim(),
                quantity: newPickupQty,
                driver: selectedDriver ? selectedDriver.trim().toUpperCase() : ""
            });

            const dateCode = format(new Date(selectedDate), "ddMMyyyy");
            const newInv = `LPB-${dateCode}-${String(items.length + 1).padStart(3, "0")}`;

            const newItem: ScheduleItem = {
                id: created.id,
                mappingId: created.id,
                activityType: "PICKUP",
                deliveryNumber: newInv,
                invoiceNumber: newInv,
                taxType: "KB-TRD",
                poNumber: created.poNumber || newPickupPo.trim() || `PO-INB-${dateCode}`,
                buyerName: created.buyerName,
                productName: created.productName,
                quantity: created.quantity,
                originalQuantity: created.quantity,
                driver: created.driver || (selectedDriver ? selectedDriver.trim().toUpperCase() : ""),
                vehiclePlate: selectedVehiclePlate || "",
                etollCard: selectedEtoll || "",
                isManual: true
            };

            setItems(prev => [newItem, ...prev]);
            setShowAddPickupModal(false);
            setNewPickupVendor("");
            setNewPickupPo("");
            setNewPickupProduct("");
            setNewPickupQty(100);
            setSaveFeedback(`Jadwal pengambilan di ${newItem.buyerName} berhasil disimpan ke database!`);
            setTimeout(() => setSaveFeedback(null), 5000);
        } catch (err: any) {
            console.error("Gagal menyimpan jadwal pickup:", err);
            alert("Gagal menyimpan jadwal pengambilan: " + (err.message || String(err)));
        } finally {
            setIsSaving(false);
        }
    };

    // Handler: Delete manual pickup schedule item
    const handleDeleteManualItem = async (e: React.MouseEvent, item: ScheduleItem) => {
        e.stopPropagation();
        const confirmDelete = window.confirm(`Hapus jadwal pengambilan di ${item.buyerName} (${item.productName})?`);
        if (!confirmDelete) return;

        setItems(prev => prev.filter(i => i.id !== item.id));
        setSelectedItemIds(prev => {
            const next = new Set(prev);
            next.delete(item.id);
            return next;
        });

        try {
            await callAction("deleteShippingMapping", item.id);
            setSaveFeedback(`Jadwal di ${item.buyerName} berhasil dihapus.`);
            setTimeout(() => setSaveFeedback(null), 4000);
        } catch (err) {
            console.error("Gagal menghapus jadwal:", err);
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
                setSelectedDrivers([]);
                setSelectedDriver("");
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
        setSelectedDrivers([]);
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

    // Export Executive Professional Excel (Format Resmi PT. Kola Borasi Indonesia)
    const handleExportProfessionalExcel = async () => {
        if (items.length === 0) {
            alert("Tidak ada data pengiriman untuk diekspor!");
            return;
        }

        try {
            setIsExportingExcel(true);
            setSaveFeedback("Sedang menyusun Rekap Excel Profesional (Format Resmi PT. Kola Borasi Indonesia)...");
            await generateProfessionalLogisticsExcel({
                items,
                selectedDate,
                currentUser,
                filenamePrefix: "REKAP_LOGISTIK_RESMI"
            });
            setSaveFeedback("Rekap Excel Profesional berhasil diunduh!");
            setTimeout(() => setSaveFeedback(null), 5000);
        } catch (err: any) {
            console.error("Gagal export excel profesional:", err);
            alert("Gagal mengunduh Excel: " + (err.message || String(err)));
        } finally {
            setIsExportingExcel(false);
            setShowExportMenu(false);
        }
    };

    // Export Specific Driver Manifest Excel
    const handleExportDriverExcel = async (drvName: string) => {
        const drvItems = items.filter(i => (i.driver || "").trim().toUpperCase() === drvName.trim().toUpperCase());
        if (drvItems.length === 0) {
            alert(`Tidak ada data muatan untuk armada ${drvName}!`);
            return;
        }

        try {
            setIsExportingExcel(true);
            setSaveFeedback(`Menyiapkan Manifest Excel Armada ${drvName}...`);
            await generateProfessionalLogisticsExcel({
                items: drvItems,
                selectedDate,
                currentUser,
                filenamePrefix: `MANIFEST_${drvName.replace(/[^a-zA-Z0-9]/g, "_")}`
            });
            setSaveFeedback(`Manifest Excel armada ${drvName} berhasil diunduh!`);
            setTimeout(() => setSaveFeedback(null), 5000);
        } catch (err: any) {
            console.error("Gagal export excel armada:", err);
            alert("Gagal mengunduh Excel: " + (err.message || String(err)));
        } finally {
            setIsExportingExcel(false);
        }
    };

    // Export Excel of all deliveries (Format Sederhana / Raw)
    const handleExportExcel = () => {
        if (items.length === 0) {
            alert("Tidak ada data pengiriman untuk diekspor!");
            return;
        }

        const excelRows: any[][] = [];
        excelRows.push([`REKAP LOGISTIK PENGIRIMAN & PENGAMBILAN HARIAN - ${dateFormattedIndo}`, "", "", "", "", "", ""]);
        excelRows.push(["KEGIATAN", "NO. FAKTUR / REF", "NO. PO", "CUSTOMER / SUPPLIER", "PRODUK", "QTY", "DRIVER / KENDARAAN"]);

        let lastDelivId: string | null = null;
        items.forEach((item, idx) => {
            const isFirstOfDeliv = item.isManual || item.deliveryId !== lastDelivId;
            if (!item.isManual && item.deliveryId) {
                lastDelivId = item.deliveryId;
            }

            excelRows.push([
                item.activityType === "PICKUP" ? "AMBIL SUPPLIER" : "KIRIM CUSTOMER",
                isFirstOfDeliv ? getRealisticInvoiceNumber(item, idx) : "",
                isFirstOfDeliv ? (item.poNumber || "") : "",
                isFirstOfDeliv ? (item.buyerName || "") : "",
                item.productName || "",
                Number(item.quantity) || 0,
                isFirstOfDeliv ? (item.driver || "") : ""
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(excelRows);
        ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];
        ws["!cols"] = [{ wch: 18 }, { wch: 24 }, { wch: 18 }, { wch: 28 }, { wch: 38 }, { wch: 12 }, { wch: 22 }];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Logistik_Harian");
        XLSX.writeFile(wb, `LOGISTIK_${selectedDate.replace(/-/g, "")}.xlsx`);
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
            {/* Print Styles: Dedicated Full A4 Page per Vehicle Manifest */}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    @page { 
                        size: A4 portrait; 
                        margin: 8mm 10mm 8mm 10mm; 
                    }
                    html, body { 
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        background: #ffffff !important;
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important;
                    }
                    .no-print, header, .stepper-bar, .feedback-bar { 
                        display: none !important; 
                    }
                    .min-h-screen {
                        min-height: auto !important;
                        padding-bottom: 0 !important;
                        background: #ffffff !important;
                    }
                    main {
                        padding: 0 !important;
                        margin: 0 !important;
                        max-width: 100% !important;
                        width: 100% !important;
                    }
                    .printable-manifest {
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        border: none !important;
                        border-radius: 0 !important;
                        box-shadow: none !important;
                        background: transparent !important;
                    }
                    .page-break-after {
                        page-break-after: always !important;
                        break-after: page !important;
                    }
                    .print-table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        font-family: Arial, Helvetica, sans-serif !important;
                        font-size: 9.5px !important;
                        color: #000000 !important;
                        table-layout: fixed !important;
                    }
                    .print-table th, .print-table td {
                        border: 1px solid #1e293b !important;
                        padding: 3.5px 5px !important;
                    }
                    .print-table th {
                        background-color: #0f172a !important;
                        color: #ffffff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .delivery-separator {
                        border-top: 2px solid #000000 !important;
                    }
                    .avoid-break {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    tr {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                }
            `}} />

            {/* Datalists for autocomplete */}
            <datalist id="driver-suggestions">
                {OFFICIAL_FLEET.map(f => (
                    <option key={f.driver} value={f.driver}>{`${f.driver} (${f.plate})`}</option>
                ))}
                <option value="EKSPEDISI">EKSPEDISI (Luar / Sewa / Vendor)</option>
                <option value="AMBIL SENDIRI">AMBIL SENDIRI (Self Pickup Gudang)</option>
                {customDrivers.map(drv => (
                    <option key={drv} value={drv} />
                ))}
            </datalist>
            <datalist id="plate-suggestions">
                {OFFICIAL_FLEET.map(f => (
                    <option key={f.plate} value={f.plate}>{`${f.plate} - ${f.driver}`}</option>
                ))}
                {allPlateOptions.filter(p => !OFFICIAL_FLEET.some(f => f.plate === p)).map(p => (
                    <option key={p} value={p} />
                ))}
            </datalist>
            <datalist id="vendor-suggestions">
                {vendorList.map(v => (
                    <option key={v} value={v} />
                ))}
            </datalist>
            <datalist id="product-suggestions">
                {productList.map(p => (
                    <option key={p} value={p} />
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

                        {/* Excel Export Group */}
                        <div className="relative">
                            <div className="inline-flex rounded-xl shadow-xs overflow-hidden border border-emerald-700/30">
                                <button
                                    onClick={handleExportProfessionalExcel}
                                    disabled={isExportingExcel}
                                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-black transition-all cursor-pointer disabled:opacity-75"
                                    title="Download Rekap Excel Profesional (Format Resmi Eksekutif PT. Kola Borasi)"
                                >
                                    {isExportingExcel ? (
                                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-100" />
                                    )}
                                    <span>Excel Profesional</span>
                                    <span className="bg-emerald-500 text-[9px] px-1 py-0.2 rounded font-black tracking-wider text-white">
                                        PRO
                                    </span>
                                </button>
                                <button
                                    onClick={() => setShowExportMenu(!showExportMenu)}
                                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-1.5 py-1.5 transition-all cursor-pointer flex items-center justify-center border-l border-emerald-600/50"
                                    title="Pilihan Format Excel"
                                >
                                    <ChevronDown className="h-3.5 w-3.5" />
                                </button>
                            </div>

                            {/* Dropdown Menu */}
                            {showExportMenu && (
                                <>
                                    <div 
                                        className="fixed inset-0 z-40" 
                                        onClick={() => setShowExportMenu(false)} 
                                    />
                                    <div className="absolute right-0 mt-1.5 w-76 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 p-2 animate-in fade-in slide-in-from-top-2">
                                        <div className="px-3 py-2 border-b border-slate-100 mb-1">
                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Opsi Download Excel</span>
                                            <p className="text-[11px] font-bold text-slate-700">Pilih Format Laporan Logistik</p>
                                        </div>

                                        <button
                                            onClick={handleExportProfessionalExcel}
                                            className="w-full text-left p-2.5 rounded-xl hover:bg-emerald-50 transition-all flex items-start gap-2.5 group cursor-pointer"
                                        >
                                            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-all mt-0.5">
                                                <FileSpreadsheet className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs font-black text-slate-900 group-hover:text-emerald-700">
                                                        Rekap Eksekutif Profesional
                                                    </span>
                                                    <span className="text-[8.5px] bg-emerald-100 text-emerald-800 font-extrabold px-1 rounded">
                                                        RESMI
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                                                    Format PT. Kola Borasi Indonesia, multi-sheet (Manifest & Rekap Armada), KPI metrics, warna, border & kolom pengesahan TTD.
                                                </p>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => {
                                                setShowExportMenu(false);
                                                handleExportExcel();
                                            }}
                                            className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100 transition-all flex items-start gap-2.5 group cursor-pointer mt-1"
                                        >
                                            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-slate-600 group-hover:text-white transition-all mt-0.5">
                                                <Download className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold text-slate-800 group-hover:text-slate-900">
                                                    Format Standar Sederhana
                                                </span>
                                                <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                                                    Tabel mentah cepat untuk kebutuhan copy-paste rumus manual.
                                                </p>
                                            </div>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
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

                    {/* Activity & Tax Category Filters */}
                    {mainView === "WIZARD" && wizardStep === 1 && (
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Activity Type Switcher */}
                            <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-black uppercase text-slate-400">Kegiatan:</span>
                                <div className="flex bg-white p-0.5 rounded-xl border border-slate-200 shadow-2xs">
                                    <button
                                        type="button"
                                        onClick={() => setActivityFilter("ALL")}
                                        className={`px-2.5 py-1 text-xs font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                                            activityFilter === "ALL" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                                        }`}
                                    >
                                        <span>Semua</span>
                                        <span className="bg-slate-200 text-slate-800 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                                            {unassignedItems.length}
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActivityFilter("DELIVERY")}
                                        className={`px-2.5 py-1 text-xs font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                                            activityFilter === "DELIVERY" ? "bg-emerald-600 text-white shadow-xs" : "text-emerald-700 hover:text-emerald-900"
                                        }`}
                                    >
                                        <span>🟢 Kirim Customer</span>
                                        {deliveryQueueCount > 0 && (
                                            <span className="bg-emerald-100 text-emerald-900 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                                                {deliveryQueueCount}
                                            </span>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActivityFilter("PICKUP")}
                                        className={`px-2.5 py-1 text-xs font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                                            activityFilter === "PICKUP" ? "bg-amber-600 text-white shadow-xs" : "text-amber-700 hover:text-amber-900"
                                        }`}
                                    >
                                        <span>🟡 Ambil Supplier (PO)</span>
                                        {pickupQueueCount > 0 && (
                                            <span className="bg-amber-100 text-amber-900 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                                                {pickupQueueCount}
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Button: + Tambah Jadwal Ambil di Supplier */}
                            <button
                                type="button"
                                onClick={() => setShowAddPickupModal(true)}
                                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer"
                                title="Tambah Jadwal Sopir Jemput Barang di Supplier / Pabrik (PO Pembelian)"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>+ Jadwal Ambil di Supplier</span>
                            </button>

                            {/* Tax Category Filter */}
                            <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-black uppercase text-slate-400">Pajak:</span>
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
                                        PKP
                                    </button>
                                    <button
                                        onClick={() => setTaxFilter("KB-TRD")}
                                        className={`px-2 py-0.5 text-xs font-bold rounded cursor-pointer ${
                                            taxFilter === "KB-TRD" ? "bg-emerald-600 text-white" : "text-emerald-700"
                                        }`}
                                    >
                                        Non-PKP
                                    </button>
                                </div>
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

                                {/* Driver Assignment & Fleet Selection Center */}
                                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
                                    {/* Header & Status */}
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
                                                <Truck className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                                                        1. Tentukan Kendaraan &amp; Sopir Muat
                                                    </h3>
                                                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                                                        <span>👥</span> Bisa Pilih 1 atau 2 Sopir
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500">
                                                    Klik nama sopir (bisa pilih sampai 2 orang untuk Sopir Utama &amp; Sopir Pendamping), vendor ekspedisi, atau ambil sendiri.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Current Active Selection Summary */}
                                        <div className="flex items-center gap-2">
                                            {selectedDrivers.length > 0 || selectedDriver ? (
                                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950 text-xs font-black shadow-2xs">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                                                    {selectedDrivers.length <= 1 ? (
                                                        <span>Armada Aktif: <strong className="text-indigo-700">{selectedDriver || selectedDrivers[0]}</strong></span>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span>Sopir 1: <strong className="text-indigo-700">{selectedDrivers[0]}</strong></span>
                                                            <span className="text-slate-400 font-normal">&amp;</span>
                                                            <span>Sopir 2: <strong className="text-emerald-700">{selectedDrivers[1]}</strong></span>
                                                        </div>
                                                    )}
                                                    {selectedVehiclePlate && (
                                                        <span className="font-mono bg-white px-2 py-0.5 rounded border border-indigo-100 text-[11px] text-slate-800">
                                                            {selectedVehiclePlate}
                                                        </span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedDrivers([]);
                                                            setSelectedDriver("");
                                                            setSelectedVehiclePlate("");
                                                            setSelectedEtoll("");
                                                        }}
                                                        className="text-[10px] text-slate-400 hover:text-rose-600 font-bold ml-1.5 cursor-pointer px-1.5 py-0.5 rounded hover:bg-rose-50 transition-colors"
                                                        title="Reset pilihan sopir"
                                                    >
                                                        Reset
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                                                    <AlertCircle className="w-3.5 h-3.5" />
                                                    <span>Silakan pilih 1 atau 2 sopir di bawah:</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 8 Visual Interactive Fleet Cards */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                                        {/* 6 Official Company Fleet */}
                                        {OFFICIAL_FLEET.map(f => {
                                            const driverIdx = selectedDrivers.indexOf(f.driver);
                                            const isSelected = driverIdx !== -1;
                                            const isPrimary = driverIdx === 0;

                                            return (
                                                <button
                                                    key={f.driver}
                                                    type="button"
                                                    onClick={() => handleToggleDriverCard(f.driver)}
                                                    className={`relative p-3 rounded-2xl border-2 text-left transition-all duration-150 cursor-pointer flex flex-col justify-between group ${
                                                        isSelected 
                                                            ? isPrimary
                                                                ? "bg-indigo-50/90 border-indigo-600 shadow-md ring-2 ring-indigo-500/20 scale-[1.02]" 
                                                                : "bg-emerald-50/90 border-emerald-600 shadow-md ring-2 ring-emerald-500/20 scale-[1.02]"
                                                            : "bg-white hover:bg-slate-50 border-slate-200 hover:border-indigo-300 hover:shadow-xs"
                                                    }`}
                                                >
                                                    {/* Top status & category */}
                                                    <div className="flex items-center justify-between gap-1 mb-2">
                                                        <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                                            isSelected 
                                                                ? isPrimary
                                                                    ? "bg-indigo-600 text-white" 
                                                                    : "bg-emerald-600 text-white"
                                                                : "bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-700"
                                                        }`}>
                                                            {isSelected ? (isPrimary ? (selectedDrivers.length > 1 ? "Sopir 1" : "Terpilih") : "Sopir 2") : "Resmi"}
                                                        </span>
                                                        {isSelected ? (
                                                            <div className={`w-5 h-5 rounded-full text-white flex items-center justify-center shadow-xs font-black text-[10px] ${
                                                                isPrimary ? "bg-indigo-600" : "bg-emerald-600"
                                                            }`}>
                                                                {selectedDrivers.length > 1 ? (driverIdx + 1) : <Check className="w-3 h-3 stroke-[3]" />}
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-300 group-hover:text-slate-400">●</span>
                                                        )}
                                                    </div>

                                                    {/* Truck Icon & Driver Name */}
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                                            isSelected 
                                                                ? isPrimary 
                                                                    ? "bg-indigo-600 text-white shadow-xs" 
                                                                    : "bg-emerald-600 text-white shadow-xs"
                                                                : "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100"
                                                        }`}>
                                                            <Truck className="w-4 h-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <span className={`text-[9px] block font-bold uppercase leading-none ${
                                                                isSelected 
                                                                    ? isPrimary ? "text-indigo-600" : "text-emerald-700" 
                                                                    : "text-slate-400"
                                                            }`}>
                                                                {isSelected ? (isPrimary ? "Sopir Utama" : "Pendamping") : "Sopir"}
                                                            </span>
                                                            <h4 className="text-xs font-black text-slate-900 truncate uppercase mt-0.5">
                                                                {f.driver}
                                                            </h4>
                                                        </div>
                                                    </div>

                                                    {/* Indonesian License Plate Style Badge */}
                                                    <div className="bg-slate-900 text-white rounded-lg px-2 py-1 text-center font-mono font-black text-[11px] tracking-wider border border-slate-800 shadow-2xs mb-1.5">
                                                        {f.plate}
                                                    </div>

                                                    {/* E-Toll Card Digits */}
                                                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1.5 border-t border-slate-100">
                                                        <span className="text-[9px] text-slate-400 uppercase font-sans font-bold flex items-center gap-1">
                                                            <CreditCard className="w-2.5 h-2.5" />
                                                            E-Toll:
                                                        </span>
                                                        <span className="font-bold text-slate-700">{f.etoll && f.etoll !== "-" ? `...${f.etoll.slice(-4)}` : "-"}</span>
                                                    </div>
                                                </button>
                                            );
                                        })}

                                        {/* Card 6: Ekspedisi (Vendor Pihak Ketiga) */}
                                        {(() => {
                                            const ekspedisiIdx = selectedDrivers.indexOf("EKSPEDISI");
                                            const isSelected = ekspedisiIdx !== -1;
                                            const isPrimary = ekspedisiIdx === 0;

                                            return (
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleDriverCard("EKSPEDISI")}
                                                    className={`relative p-3 rounded-2xl border-2 text-left transition-all duration-150 cursor-pointer flex flex-col justify-between group ${
                                                        isSelected 
                                                            ? "bg-amber-50/80 border-amber-600 shadow-md ring-2 ring-amber-500/20 scale-[1.02]" 
                                                            : "bg-white hover:bg-amber-50/40 border-slate-200 hover:border-amber-300 hover:shadow-xs"
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between gap-1 mb-2">
                                                        <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                                            isSelected ? "bg-amber-600 text-white" : "bg-amber-100 text-amber-800"
                                                        }`}>
                                                            {isSelected ? (selectedDrivers.length > 1 ? (isPrimary ? "Sopir 1" : "Sopir 2") : "Vendor") : "Vendor"}
                                                        </span>
                                                        {isSelected ? (
                                                            <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-xs font-black text-[10px]">
                                                                {selectedDrivers.length > 1 ? (ekspedisiIdx + 1) : <Check className="w-3 h-3 stroke-[3]" />}
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-300 group-hover:text-amber-400">●</span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                                            isSelected ? "bg-amber-600 text-white shadow-xs" : "bg-amber-100 text-amber-700 group-hover:bg-amber-200"
                                                        }`}>
                                                            <Package className="w-4 h-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <span className="text-[9px] block font-bold text-amber-600 uppercase leading-none">Pihak Ketiga</span>
                                                            <h4 className="text-xs font-black text-slate-900 truncate uppercase mt-0.5">
                                                                EKSPEDISI
                                                            </h4>
                                                        </div>
                                                    </div>

                                                    <div className="bg-amber-50 text-amber-900 rounded-lg px-2 py-1 text-center font-bold text-[10px] border border-amber-200 shadow-2xs mb-1.5 truncate">
                                                        Sewa / Luar
                                                    </div>

                                                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-100">
                                                        <span className="text-[9px] text-slate-400 uppercase font-sans font-bold">Plat:</span>
                                                        <span className="font-bold text-amber-800">Bebas/Manual</span>
                                                    </div>
                                                </button>
                                            );
                                        })()}

                                        {/* Card 7: Ambil Sendiri (Self Pickup di Gudang) */}
                                        {(() => {
                                            const isSelected = selectedDrivers.includes("AMBIL SENDIRI") || selectedDriver === "AMBIL SENDIRI" || selectedDriver.includes("SELF PICKUP");
                                            return (
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleDriverCard("AMBIL SENDIRI")}
                                                    className={`relative p-3 rounded-2xl border-2 text-left transition-all duration-150 cursor-pointer flex flex-col justify-between group ${
                                                        isSelected 
                                                            ? "bg-emerald-50/80 border-emerald-600 shadow-md ring-2 ring-emerald-500/20 scale-[1.02]" 
                                                            : "bg-white hover:bg-emerald-50/40 border-slate-200 hover:border-emerald-300 hover:shadow-xs"
                                                    }`}
                                                    title="Customer / Toko membawa armada sendiri untuk mengambil barang langsung di gudang"
                                                >
                                                    <div className="flex items-center justify-between gap-1 mb-2">
                                                        <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                                            isSelected ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-800"
                                                        }`}>
                                                            Loco
                                                        </span>
                                                        {isSelected ? (
                                                            <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                                                                <Check className="w-3 h-3 stroke-[3]" />
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-300 group-hover:text-emerald-400">●</span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                                            isSelected ? "bg-emerald-600 text-white shadow-xs" : "bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200"
                                                        }`}>
                                                            <Store className="w-4 h-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <span className="text-[9px] block font-bold text-emerald-600 uppercase leading-none">Self Pickup</span>
                                                            <h4 className="text-xs font-black text-slate-900 truncate uppercase mt-0.5">
                                                                AMBIL SENDIRI
                                                            </h4>
                                                        </div>
                                                    </div>

                                                    <div className="bg-emerald-50 text-emerald-900 rounded-lg px-2 py-1 text-center font-bold text-[10px] border border-emerald-200 shadow-2xs mb-1.5 truncate">
                                                        Pelanggan Jemput
                                                    </div>

                                                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-100">
                                                        <span className="text-[9px] text-slate-400 uppercase font-sans font-bold">Lokasi:</span>
                                                        <span className="font-bold text-emerald-800">Pintu Gudang</span>
                                                    </div>
                                                </button>
                                            );
                                        })()}
                                    </div>

                                    {/* Detail & Fine-Tuning Bar for Selected Vehicle */}
                                    <div className="bg-slate-50/90 rounded-2xl p-3.5 border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-2xs shrink-0">
                                                <Edit3 className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                                                        Detail &amp; Penyesuaian Armada Terpilih
                                                    </h4>
                                                    {selectedDrivers.length === 2 && (
                                                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-indigo-100 text-indigo-800 uppercase">
                                                            2 Sopir Aktif
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-slate-500">
                                                    {selectedDriver 
                                                        ? `Data armada terisi otomatis sesuai ${selectedDriver}. Anda dapat memilih mobil atau mengedit plat/e-toll jika diperlukan.`
                                                        : "Pilih salah satu armada di atas untuk menampilkan dan mengedit detail plat nomor serta e-toll."}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2.5">
                                            {/* Quick Vehicle Switcher if 2 Official Drivers Selected */}
                                            {selectedDrivers.length === 2 && (
                                                <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-xl border border-indigo-200 shadow-2xs">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Mobil:</span>
                                                    {selectedDrivers.map((drv, idx) => {
                                                        const f = OFFICIAL_FLEET.find(item => item.driver.toUpperCase() === drv.toUpperCase());
                                                        if (!f) return null;
                                                        const isCurrentPlate = selectedVehiclePlate.replace(/\s+/g, "") === f.plate.replace(/\s+/g, "");
                                                        return (
                                                            <button
                                                                key={f.driver}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedVehiclePlate(f.plate);
                                                                    setSelectedEtoll(f.etoll);
                                                                }}
                                                                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                                                    isCurrentPlate
                                                                        ? "bg-indigo-600 text-white shadow-2xs"
                                                                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                                                }`}
                                                                title={`Gunakan mobil ${f.driver} (${f.plate})`}
                                                            >
                                                                <span>{idx === 0 ? "Mobil 1" : "Mobil 2"}: {f.driver}</span>
                                                                <span className="font-mono text-[10px] opacity-90">({f.plate})</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Sopir Input (Customizable or via list) */}
                                            <div className="flex items-center gap-1.5">
                                                <label className="text-[11px] font-bold text-slate-600 uppercase">Sopir:</label>
                                                <input
                                                    list="driver-suggestions"
                                                    type="text"
                                                    value={selectedDriver}
                                                    onChange={(e) => handleDriverSelect(e.target.value)}
                                                    placeholder="Nama Sopir / Ekspedisi"
                                                    className="bg-white border border-slate-200 focus:border-indigo-600 px-3 py-1.5 rounded-xl text-xs font-black text-slate-900 uppercase outline-none transition-all w-44 sm:w-52 shadow-2xs"
                                                />
                                            </div>

                                            {/* No. Polisi (Editable) */}
                                            <div className="flex items-center gap-1.5">
                                                <label className="text-[11px] font-bold text-slate-600 uppercase">No. Polisi:</label>
                                                <input
                                                    list="plate-suggestions"
                                                    type="text"
                                                    value={selectedVehiclePlate}
                                                    onChange={(e) => handlePlateSelect(e.target.value)}
                                                    placeholder="Contoh: B 9198 FCM"
                                                    className="bg-white border border-slate-200 focus:border-indigo-600 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-slate-900 uppercase outline-none transition-all w-36 sm:w-40 shadow-2xs"
                                                />
                                            </div>

                                            {/* No. E-Toll (Editable with Clear Button) */}
                                            <div className="flex items-center gap-1.5">
                                                <label className="text-[11px] font-bold text-slate-600 uppercase">E-Toll:</label>
                                                <div className="relative flex items-center">
                                                    <input
                                                        type="text"
                                                        value={selectedEtoll}
                                                        onChange={(e) => setSelectedEtoll(e.target.value)}
                                                        placeholder="Manual / Kosong"
                                                        className="bg-white border border-slate-200 focus:border-indigo-600 pl-3 pr-7 py-1.5 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none transition-all w-44 shadow-2xs"
                                                    />
                                                    {selectedEtoll && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedEtoll("")}
                                                            className="absolute right-2 text-slate-400 hover:text-rose-600 font-black text-xs cursor-pointer"
                                                            title="Kosongkan E-Toll"
                                                        >
                                                            ×
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Add Custom Driver Modal Button */}
                                            <button
                                                type="button"
                                                onClick={() => setShowAddDriverModal(true)}
                                                className="p-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 shadow-2xs cursor-pointer transition-all"
                                                title="Tambah Sopir Baru ke Database"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
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
                                                        <th className="py-3 px-2.5 w-24 text-center">KEGIATAN</th>
                                                        <th className="py-3 px-3 w-32">NO. FAKTUR / REF</th>
                                                        <th className="py-3 px-3 w-28">NO. PO</th>
                                                        <th className="py-3 px-4 w-44">CUSTOMER / SUPPLIER</th>
                                                        <th className="py-3 px-4">NAMA PRODUK</th>
                                                        <th className="py-3 px-3 w-36 text-right">QTY MUAT / AMBIL</th>
                                                        <th className="py-3 px-3 w-24 text-center">STATUS</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {selectableItems.map((item, index) => {
                                                        const isSelected = selectedItemIds.has(item.id);
                                                        const realInvoice = getRealisticInvoiceNumber(item, index);
                                                        const isAlreadyInEditingFleet = editingDriver && (item.driver || "").trim().toUpperCase() === editingDriver;
                                                        const isPickup = item.activityType === "PICKUP";

                                                        return (
                                                            <tr 
                                                                key={item.id} 
                                                                onClick={() => handleToggleSelectItem(item.id)}
                                                                className={`cursor-pointer transition-colors ${
                                                                    isSelected ? "bg-indigo-50/80 font-semibold" : "hover:bg-slate-50/80"
                                                                }`}
                                                            >
                                                                <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isSelected}
                                                                        onChange={() => handleToggleSelectItem(item.id)}
                                                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                    />
                                                                </td>
                                                                <td className="py-2.5 px-2 text-center text-slate-400 font-bold">
                                                                    {index + 1}
                                                                </td>
                                                                <td className="py-2.5 px-2.5 text-center">
                                                                    {isPickup ? (
                                                                        <span className="bg-amber-100 text-amber-900 border border-amber-200 text-[9px] font-black px-2 py-0.5 rounded-full uppercase inline-block">
                                                                            🟡 Ambil PO
                                                                        </span>
                                                                    ) : (
                                                                        <span className="bg-emerald-100 text-emerald-900 border border-emerald-200 text-[9px] font-black px-2 py-0.5 rounded-full uppercase inline-block">
                                                                            🟢 Kirim
                                                                        </span>
                                                                    )}
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
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span>{item.buyerName}</span>
                                                                        {isPickup && (
                                                                            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1 rounded">
                                                                                Pabrik/Vendor
                                                                            </span>
                                                                        )}
                                                                        {item.isManual && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => handleDeleteManualItem(e, item)}
                                                                                className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                                                                                title="Hapus jadwal pengambilan manual ini"
                                                                            >
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="py-2.5 px-4 font-medium text-slate-800 uppercase">
                                                                    {item.productName}
                                                                </td>
                                                                <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                                                                    <div className="flex flex-col items-end gap-1">
                                                                        <div className="flex items-center gap-1">
                                                                            <input
                                                                                type="number"
                                                                                min="1"
                                                                                max={item.originalQuantity || 999999}
                                                                                value={item.quantity || ""}
                                                                                onChange={(e) => {
                                                                                    const val = e.target.value === "" ? 0 : parseInt(e.target.value, 10);
                                                                                    if (!isNaN(val)) {
                                                                                        handleUpdateItemQuantity(item.id, val);
                                                                                    }
                                                                                }}
                                                                                className="w-20 px-2 py-1 bg-white border border-slate-300 focus:border-indigo-600 rounded-lg text-right font-black text-xs text-slate-900 outline-none shadow-2xs"
                                                                                title="Ubah QTY jika armada hanya memuat sebagian (Option A: sisa otomatis masuk antrian mobil berikutnya)"
                                                                            />
                                                                            <span className="text-[10px] text-slate-500 font-bold">Unit</span>
                                                                        </div>
                                                                        {item.originalQuantity && item.quantity < item.originalQuantity && !item.remainderCancelled && (
                                                                            <div className="flex items-center gap-1">
                                                                                <span className="bg-amber-100 text-amber-900 text-[9px] font-black px-1.5 py-0.2 rounded">
                                                                                    Sisa {(item.originalQuantity - item.quantity).toLocaleString("id-ID")} antri
                                                                                </span>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleCancelRemainder(item.id)}
                                                                                    className="text-[9px] font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                                                                                    title="Batalkan sisa unit (penolakan / cut order) agar tidak masuk antrian mobil berikutnya"
                                                                                >
                                                                                    Batal Sisa
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                        {item.remainderCancelled && (
                                                                            <span className="bg-rose-100 text-rose-800 text-[9px] font-bold px-1.5 py-0.2 rounded">
                                                                                Sisa dibatalkan
                                                                            </span>
                                                                        )}
                                                                    </div>
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
                                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                                            Daftar Kegiatan &amp; Barang Armada {selectedDriver}:
                                        </h3>
                                        {selectedItemsForVerification.some(i => i.activityType === "PICKUP") && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                                                🟡 Termasuk Pengambilan Barang di Supplier (Inbound PO)
                                            </span>
                                        )}
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black uppercase tracking-wider text-[11px]">
                                                    <th className="py-3 px-3 w-10 text-center">NO</th>
                                                    <th className="py-3 px-2.5 w-24 text-center">KEGIATAN</th>
                                                    <th className="py-3 px-3 w-36">NO. FAKTUR / REF</th>
                                                    <th className="py-3 px-3 w-32">NO. PO</th>
                                                    <th className="py-3 px-4 w-48">CUSTOMER / SUPPLIER</th>
                                                    <th className="py-3 px-4">NAMA PRODUK</th>
                                                    <th className="py-3 px-3 w-24 text-right">QTY MUAT</th>
                                                    <th className="py-3 px-4 w-28 text-center">CEK FISIK GUDANG</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {selectedItemsForVerification.map((item, index) => {
                                                    const realInvoice = getRealisticInvoiceNumber(item, index);
                                                    const isChecked = Boolean(physicalChecklist[item.id]);
                                                    const isPickup = item.activityType === "PICKUP";

                                                    return (
                                                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                                            <td className="py-2.5 px-3 text-center text-slate-400 font-bold">
                                                                {index + 1}
                                                            </td>
                                                            <td className="py-2.5 px-2.5 text-center">
                                                                {isPickup ? (
                                                                    <span className="bg-amber-100 text-amber-900 border border-amber-200 text-[9px] font-black px-2 py-0.5 rounded-full uppercase inline-block">
                                                                        🟡 Ambil PO
                                                                    </span>
                                                                ) : (
                                                                    <span className="bg-emerald-100 text-emerald-900 border border-emerald-200 text-[9px] font-black px-2 py-0.5 rounded-full uppercase inline-block">
                                                                        🟢 Kirim
                                                                    </span>
                                                                )}
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
                                                                <div className="flex items-center gap-1.5">
                                                                    <span>{item.buyerName}</span>
                                                                    {isPickup && (
                                                                        <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1 rounded">
                                                                            Pabrik/Vendor
                                                                        </span>
                                                                    )}
                                                                </div>
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
                                                    <td colSpan={6} className="py-3 px-4 text-right uppercase">
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
                                            Klik tombol konfirmasi untuk menerbitkan Surat Tugas &amp; Muatan Kendaraan resmi dan mengupdate sistem.
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
                                                Penugasan Armada {lastCompletedDriver || selectedDriver} Selesai & Tervalidasi!
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
                                {(() => {
                                    const hasPickups = selectedItemsForVerification.some(i => i.activityType === "PICKUP");
                                    const isAllPickups = selectedItemsForVerification.length > 0 && selectedItemsForVerification.every(i => i.activityType === "PICKUP");

                                    return (
                                        <div className="printable-manifest bg-white border border-slate-300 rounded-2xl shadow-xl p-6 sm:p-9 max-w-4xl mx-auto print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:w-full print:rounded-none">
                                            {/* Header Manifest */}
                                            <div className="border-b-2 border-slate-900 pb-2.5">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div className="flex items-center gap-3.5">
                                                        <div className="h-12 w-12 shrink-0 flex items-center justify-center p-1 bg-white border border-slate-200 rounded-lg">
                                                            <img 
                                                                src="/image/logokoboi.png" 
                                                                alt="Logo PT. Kola Borasi Indonesia" 
                                                                className="h-10 w-auto object-contain"
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
                                                                    {isAllPickups ? "LOGISTIK PEMBELIAN" : "DISTRIBUSI"}
                                                                </span>
                                                            </div>
                                                            <p className="text-[9.5px] text-slate-700 font-bold tracking-wider uppercase mt-0.5">
                                                                {isAllPickups ? "Perintah Penjemputan Barang di Supplier / Pabrik" : "Logistik Gudang & Distribusi Pengiriman Terpadu"}
                                                            </p>
                                                            <p className="text-[8px] text-slate-500 font-medium">
                                                                Jl. Arjuna IV Green Kartika Residence Blok EE NO.2, CIBINONG, KAB. BOGOR
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <span className="inline-block px-3 py-1 rounded text-xs font-black uppercase tracking-wider bg-slate-900 text-white">
                                                            {isAllPickups 
                                                                ? "SURAT TUGAS & PERINTAH AMBIL BARANG (PICKUP PO)" 
                                                                : hasPickups 
                                                                    ? "SURAT TUGAS PENGIRIMAN & PENGAMBILAN BARANG" 
                                                                    : "SURAT MUATAN KENDARAAN (LOADING MANIFEST)"}
                                                        </span>
                                                        <p className="text-[10px] font-mono text-slate-700 mt-1 font-bold">
                                                            TANGGAL: {dateFormattedIndo}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Prominent Info Box */}
                                                <div className="grid grid-cols-5 gap-2 text-[10px] bg-slate-100/90 p-2 rounded border border-slate-300 mt-2.5">
                                                    <div>
                                                        <span className="text-slate-500 block uppercase font-bold text-[8.5px]">Sopir / Driver:</span>
                                                        <span className="font-black text-slate-950 text-xs sm:text-sm uppercase tracking-wide truncate block">
                                                            🚚 {lastCompletedDriver || selectedDriver}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500 block uppercase font-bold text-[8.5px]">No. Polisi / Plat:</span>
                                                        <span className="font-black text-slate-900 uppercase block font-mono text-xs">
                                                            {selectedVehiclePlate || getFleetByDriverOrPlate(lastCompletedDriver || selectedDriver)?.plate || "-"}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500 block uppercase font-bold text-[8.5px]">No. Kartu E-Toll:</span>
                                                        <span className="font-mono font-bold text-slate-900 text-[9.5px] block truncate">
                                                            {selectedEtoll || getFleetByDriverOrPlate(lastCompletedDriver || selectedDriver)?.etoll || "-"}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500 block uppercase font-bold text-[8.5px]">
                                                            {isAllPickups ? "Total Lokasi Supplier:" : "Total Drop/Surat Jalan:"}
                                                        </span>
                                                        <span className="font-black text-slate-900 text-xs block">
                                                            {selectedUniqueDeliveries} {isAllPickups ? "Lokasi Supplier" : "Surat Jalan"}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500 block uppercase font-bold text-[8.5px]">
                                                            {isAllPickups ? "Total QTY Ambil:" : "Total Fisik Muatan:"}
                                                        </span>
                                                        <span className="font-black text-blue-900 text-xs block">
                                                            {selectedTotalQty.toLocaleString("id-ID")} Unit
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Manifest Table */}
                                            <div className="mt-2.5">
                                                <table className="w-full print-table border-collapse text-black text-[9.5px]">
                                                    <thead>
                                                        <tr className="bg-slate-900 text-white text-[9px] font-black uppercase">
                                                            <th className="border border-slate-800 py-1.5 px-1 w-[4%] text-center">NO</th>
                                                            <th className="border border-slate-800 py-1.5 px-1 w-[7%] text-center">JENIS</th>
                                                            <th className="border border-slate-800 py-1.5 px-1.5 w-[16%] text-center">NO. FAKTUR / REF</th>
                                                            <th className="border border-slate-800 py-1.5 px-1.5 w-[13%] text-center">NO. PO</th>
                                                            <th className="border border-slate-800 py-1.5 px-2 w-[22%] text-center">
                                                                {isAllPickups ? "NAMA SUPPLIER / PABRIK" : "CUSTOMER / SUPPLIER"}
                                                            </th>
                                                            <th className="border border-slate-800 py-1.5 px-2 w-[24%] text-center">NAMA PRODUK</th>
                                                            <th className="border border-slate-800 py-1.5 px-1.5 w-[6%] text-center">QTY</th>
                                                            <th className="border border-slate-800 py-1.5 px-1 w-[4%] text-center">FISIK</th>
                                                            <th className="border border-slate-800 py-1.5 px-1 w-[4%] text-center">PARAF</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(() => {
                                                            let lastDocId: string | null = null;
                                                            let deliveryIndex = 0;

                                                            return selectedItemsForVerification.map((item, idx) => {
                                                                const docId = item.deliveryId || item.receiptId || item.id;
                                                                const isFirstOfDeliv = item.isManual || docId !== lastDocId;
                                                                if (isFirstOfDeliv) {
                                                                    deliveryIndex++;
                                                                }
                                                                if (!item.isManual) {
                                                                    lastDocId = docId;
                                                                }

                                                                const realInvoice = getRealisticInvoiceNumber(item, idx);
                                                                const isPickup = item.activityType === "PICKUP";

                                                                return (
                                                                    <tr 
                                                                        key={idx} 
                                                                        className={`${isFirstOfDeliv && idx !== 0 ? "delivery-separator border-t-2 border-slate-800" : ""}`}
                                                                    >
                                                                        <td className="border border-slate-400 py-1 px-1 text-center font-bold text-[9px]">
                                                                            {isFirstOfDeliv ? deliveryIndex : ""}
                                                                        </td>
                                                                        <td className="border border-slate-400 py-1 px-1 text-center font-bold text-[8px] uppercase">
                                                                            {isPickup ? "AMBIL PO" : "KIRIM"}
                                                                        </td>
                                                                        <td className="border border-slate-400 py-1 px-1.5 font-bold text-[8.5px] uppercase whitespace-nowrap">
                                                                            {isFirstOfDeliv ? (
                                                                                <div>
                                                                                    <span className="block font-black">{realInvoice}</span>
                                                                                    <span className="text-[7.5px] text-slate-500 font-mono">{item.deliveryNumber}</span>
                                                                                </div>
                                                                            ) : ""}
                                                                        </td>
                                                                        <td className="border border-slate-400 py-1 px-1.5 font-semibold uppercase text-[8.5px]">
                                                                            {isFirstOfDeliv ? (item.poNumber || "-") : ""}
                                                                        </td>
                                                                        <td className="border border-slate-400 py-1 px-1.5 font-bold uppercase text-[9px]">
                                                                            {isFirstOfDeliv ? item.buyerName : ""}
                                                                        </td>
                                                                        <td className="border border-slate-400 py-1 px-1.5 uppercase font-medium text-[9px]">
                                                                            {item.productName}
                                                                        </td>
                                                                        <td className="border border-slate-400 py-1 px-1 text-center font-black text-[9.5px]">
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
                                                        <tr className="bg-slate-100 font-black text-[9.5px]">
                                                            <td colSpan={6} className="border border-slate-400 py-1.5 px-3 text-right uppercase">
                                                                TOTAL MUATAN ARMADA INI:
                                                            </td>
                                                            <td className="border border-slate-400 py-1.5 px-1 text-center text-blue-900 font-black">
                                                                {selectedTotalQty.toLocaleString("id-ID")}
                                                            </td>
                                                            <td colSpan={2} className="border border-slate-400 py-1.5 px-2 text-center text-[8px] text-slate-500">
                                                                Unit / Koli
                                                            </td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>

                                            {/* Signatures 3-Way Accountability */}
                                            <div className="avoid-break pt-2.5 mt-3 border-t border-slate-300">
                                                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                                                    <div className="flex flex-col justify-between h-20 border border-slate-300 p-1.5 rounded bg-white">
                                                        <span className="text-[9px] font-black uppercase text-slate-700">
                                                            {isAllPickups ? "Logistik Kola Borasi (Pemberi Tugas)" : "Disiapkan / Checker Gudang"}
                                                        </span>
                                                        <div className="border-b border-slate-400 w-4/5 mx-auto pb-0.5">
                                                            ( ............................................ )
                                                        </div>
                                                        <span className="text-[8px] text-slate-500">
                                                            {isAllPickups ? "Admin / Logistik" : "Petugas Muat"}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col justify-between h-20 border border-slate-300 p-1.5 rounded bg-slate-50/50">
                                                        <span className="text-[9px] font-black uppercase text-slate-800">
                                                            {isAllPickups ? "Sopir Penjemput (Penerima Tugas)" : "Diterima di Kendaraan (Sopir)"}
                                                        </span>
                                                        <div className="border-b border-slate-400 w-4/5 mx-auto pb-0.5 font-bold text-[9px]">
                                                            ( {lastCompletedDriver || selectedDriver} )
                                                        </div>
                                                        <span className="text-[8px] text-slate-500">Driver Bertanggung Jawab</span>
                                                    </div>
                                                    <div className="flex flex-col justify-between h-20 border border-slate-300 p-1.5 rounded bg-white">
                                                        <span className="text-[9px] font-black uppercase text-slate-700">
                                                            {isAllPickups ? "PIC Supplier / Vendor (Pemberi Barang)" : "Mengetahui / Mengesahkan"}
                                                        </span>
                                                        <div className="border-b border-slate-400 w-4/5 mx-auto pb-0.5">
                                                            ( ............................................ )
                                                        </div>
                                                        <span className="text-[8px] text-slate-500">
                                                            {isAllPickups ? "Tanda Tangan & Cap Supplier" : "Kepala Gudang / Logistik"}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-center text-[7.5px] text-slate-500 mt-2 px-0.5">
                                                    <span>
                                                        {isAllPickups 
                                                            ? "Perhatian: Sopir wajib memeriksa fisik & jumlah barang serta meminta cap/paraf PIC Supplier sebelum meninggalkan lokasi pabrik."
                                                            : "Perhatian: Seluruh fisik muatan wajib dihitung bersama Checker Gudang sebelum kendaraan meninggalkan loading dock."}
                                                    </span>
                                                    <span>Dicetak: {format(new Date(), "dd/MM/yyyy HH:mm")} WIB • ERP System</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
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

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleExportProfessionalExcel}
                                    disabled={isExportingExcel}
                                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-75"
                                    title="Download Seluruh Ringkasan Armada dalam format Excel Profesional"
                                >
                                    {isExportingExcel ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <FileSpreadsheet className="w-4 h-4" />
                                    )}
                                    <span>Export Excel Armada</span>
                                </button>
                                <button
                                    onClick={handleStartNextVehicle}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Muat Kendaraan Baru</span>
                                </button>
                            </div>
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
                                                            {drvName === "EKSPEDISI" ? (
                                                                <>
                                                                    <span>📦</span>
                                                                    <span className="text-amber-600 font-black">EKSPEDISI (LUAR)</span>
                                                                </>
                                                            ) : drvName === "AMBIL SENDIRI" || drvName.includes("SELF PICKUP") ? (
                                                                <>
                                                                    <span>🏬</span>
                                                                    <span className="text-emerald-700 font-black">AMBIL SENDIRI (SELF PICKUP)</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span>🚚 ARMADA:</span>
                                                                    <span className="text-indigo-600 font-black">{drvName}</span>
                                                                </>
                                                            )}
                                                        </h3>
                                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                                            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-mono font-bold text-slate-700">
                                                                {drvItems.find(i => i.vehiclePlate)?.vehiclePlate || fleetInfo?.plate || (
                                                                    drvName === "EKSPEDISI" 
                                                                        ? "Ekspedisi / Sewa" 
                                                                        : drvName.includes("AMBIL SENDIRI") || drvName.includes("SELF PICKUP")
                                                                            ? "Mobil Sendiri / Loco" 
                                                                            : "Truk Toko"
                                                                )}
                                                            </span>
                                                            {(drvItems.find(i => i.etollCard)?.etollCard || fleetInfo?.etoll) && (
                                                                <span className="text-[9.5px] bg-blue-50 text-blue-800 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                                                                    <CreditCard className="w-3 h-3 text-blue-600" />
                                                                    <span>{drvItems.find(i => i.etollCard)?.etollCard || fleetInfo?.etoll}</span>
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

                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        onClick={() => handleExportDriverExcel(drvName)}
                                                        disabled={isExportingExcel}
                                                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2.5 py-1.5 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer shadow-2xs disabled:opacity-50"
                                                        title="Download Manifest Excel untuk Armada ini"
                                                    >
                                                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                                                        <span className="hidden sm:inline">Excel</span>
                                                    </button>

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
                                                            const itemPlate = drvItems.find(i => i.vehiclePlate)?.vehiclePlate || fleetInfo?.plate || "";
                                                            const itemEtoll = drvItems.find(i => i.etollCard)?.etollCard || fleetInfo?.etoll || "";
                                                            setSelectedItemIds(targetItemIds);
                                                            setSelectedDriver(drvName);
                                                            setSelectedVehiclePlate(itemPlate);
                                                            setSelectedEtoll(itemEtoll);
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
                                    onClick={handleExportProfessionalExcel}
                                    disabled={isExportingExcel}
                                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-75"
                                    title="Download Seluruh Rekapitulasi dalam format Excel Profesional (.xlsx)"
                                >
                                    {isExportingExcel ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <FileSpreadsheet className="w-4 h-4" />
                                    )}
                                    <span>Download Rekap Excel Profesional (.xlsx)</span>
                                </button>
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
                                        <th className="py-3 px-2 w-20 text-center">KEGIATAN</th>
                                        <th className="py-3 px-3 w-32">NO. FAKTUR / REF</th>
                                        <th className="py-3 px-3 w-28">NO. PO</th>
                                        <th className="py-3 px-4 w-44">CUSTOMER / SUPPLIER</th>
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
                                        const isPickup = item.activityType === "PICKUP";

                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="py-2.5 px-3 text-center text-slate-400 font-bold">
                                                    {index + 1}
                                                </td>
                                                <td className="py-2.5 px-2 text-center">
                                                    {isPickup ? (
                                                        <span className="bg-amber-100 text-amber-900 text-[8.5px] font-black px-1.5 py-0.5 rounded uppercase">
                                                            Ambil PO
                                                        </span>
                                                    ) : (
                                                        <span className="bg-emerald-100 text-emerald-900 text-[8.5px] font-black px-1.5 py-0.5 rounded uppercase">
                                                            Kirim
                                                        </span>
                                                    )}
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

            {/* Modal: Tambah Jadwal Ambil di Supplier (Inbound Pickup PO) */}
            {showAddPickupModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 flex flex-col gap-4">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                                <Truck className="h-4 w-4 text-amber-600" />
                                <span>Jadwal Ambil Barang di Supplier (Inbound PO)</span>
                            </h4>
                            <button
                                onClick={() => setShowAddPickupModal(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                                    Nama Supplier / Pabrik Vendor:
                                </label>
                                <input
                                    list="vendor-suggestions"
                                    type="text"
                                    value={newPickupVendor}
                                    onChange={(e) => setNewPickupVendor(e.target.value.toUpperCase())}
                                    placeholder="Pilih atau ketik nama Supplier / Pabrik"
                                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 uppercase outline-none"
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                                    No. PO / Referensi Pembelian:
                                </label>
                                <input
                                    type="text"
                                    value={newPickupPo}
                                    onChange={(e) => setNewPickupPo(e.target.value.toUpperCase())}
                                    placeholder="Contoh: PO/KB/2610/012 (Opsional)"
                                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 uppercase outline-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                                    Nama Produk / Barang:
                                </label>
                                <input
                                    list="product-suggestions"
                                    type="text"
                                    value={newPickupProduct}
                                    onChange={(e) => setNewPickupProduct(e.target.value.toUpperCase())}
                                    placeholder="Ketik atau pilih nama produk"
                                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 uppercase outline-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                                    QTY yang Diambil (Unit / Koli):
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={newPickupQty}
                                    onChange={(e) => setNewPickupQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl px-3 py-2 text-xs font-black text-slate-900 outline-none"
                                />
                            </div>

                            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                                💡 Jadwal ini akan otomatis masuk ke antrian lantai gudang dengan badge <strong>🟡 Ambil PO</strong> dan dapat ditugaskan langsung ke sopir/mobil mana pun.
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                            <button
                                onClick={() => setShowAddPickupModal(false)}
                                className="px-3.5 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 rounded-xl cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleAddNewPickup}
                                disabled={!newPickupVendor.trim() || !newPickupProduct.trim() || newPickupQty <= 0}
                                className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-4 py-1.5 text-xs font-black uppercase rounded-xl shadow-xs transition-all cursor-pointer"
                            >
                                Simpan Jadwal Ambil
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ShippingScheduleDashboard;
