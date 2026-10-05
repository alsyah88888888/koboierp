"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Plus, Warehouse as WarehouseIcon, Layers, Trash2, FileText, Search, Activity, Box, ArrowUpRight, ArrowDownLeft, Download, Eye, Edit2, ArrowLeftRight, ChevronDown, ChevronRight, AlertTriangle, Truck, RotateCcw, X, Filter } from "lucide-react";
import { StockInputModal } from "./StockInputModal";
import { StockAdjustmentModal } from "./StockAdjustmentModal";
import { StockTransferModal } from "./StockTransferModal";
import { StockCardModal } from "./StockCardModal";
import { CheckerBoard } from "./CheckerBoard";
import { DashboardStats } from "../components/DashboardStats";
import { cn, formatCurrency } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { callAction } from "@/proxy";

import { format } from "date-fns";
import { exportToExcel } from "@/lib/excel";
import { ReportPreviewModal } from "@/components/ReportPreviewModal";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Link from "next/link";

export function WarehouseDashboard({ initialProducts, warehouses, unverifiedReceipts, movements }: {
    initialProducts: any[],
    warehouses: any[],
    unverifiedReceipts: any[],
    movements: any[]
}) {
    const { data: session } = useSession() as any;
    const isAdmin = session?.user?.role === "ADMIN";
    const [showInputModal, setShowInputModal] = useState(false);
    const [activeTab, setActiveTab] = useState<"inventory" | "checker">("inventory");
    const [searchTerm, setSearchTerm] = useState("");
    const [warehouseFilter, setWarehouseFilter] = useState<string>("ALL");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
    const [vendorFilter, setVendorFilter] = useState<string>("ALL");
    const [salesFilter, setSalesFilter] = useState<string>("ALL");
    const [sortBy, setSortBy] = useState<"STOCK_FIRST" | "QTY_DESC" | "QTY_ASC" | "NAME_ASC" | "SKU_ASC">("STOCK_FIRST");
    const [allExpanded, setAllExpanded] = useState<boolean>(false);

    const [selectedStockForAdjustment, setSelectedStockForAdjustment] = useState<{product: any, stock: any} | null>(null);
    const [selectedStockForTransfer, setSelectedStockForTransfer] = useState<{product: any, stock: any} | null>(null);
    const [showStockCard, setShowStockCard] = useState(false);
    const [selectedProductIdForCard, setSelectedProductIdForCard] = useState<string | undefined>(undefined);
    const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});
    const [isClient, setIsClient] = useState(false);

    const toggleProduct = (id: string) => {
        setExpandedProducts(prev => ({...prev, [id]: !prev[id]}));
    };

    useEffect(() => {
        setIsClient(true);
    }, []);

    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [previewTitle, setPreviewTitle] = useState("");

    // Extract unique categories from initialProducts
    const availableCategories = useMemo(() => {
        const set = new Set<string>();
        initialProducts.forEach((p: any) => {
            const cat = (p.category || "").trim().toUpperCase();
            if (cat) set.add(cat);
        });
        return Array.from(set).sort();
    }, [initialProducts]);

    // Extract unique vendors from stocks
    const availableVendors = useMemo(() => {
        const set = new Set<string>();
        initialProducts.forEach((p: any) => {
            (p.stocks || []).forEach((s: any) => {
                const v = (s.vendorName || "").trim();
                if (v) set.add(v);
            });
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [initialProducts]);

    // Pre-indexed map for unverified receipts to ensure O(1) instantaneous lookups and avoid main thread freezes
    const receiptMetaMap = useMemo(() => {
        const map = new Map<string, { salesPerson: string; hpp: number; taxRate: number }>();
        if (!Array.isArray(unverifiedReceipts)) return map;
        for (const r of unverifiedReceipts) {
            if (!r || !Array.isArray(r.items)) continue;
            const vendor = String(r.receivedFrom || "CIBINONG").trim().toLowerCase();
            const sp = String(r.salesPerson || "").trim();
            const tax = Number(r.taxRate || 0);
            for (const item of r.items) {
                if (!item || !item.productId) continue;
                const price = Number(item.purchasePrice || 0);
                const key = `${item.productId}_${vendor}`;
                if (!map.has(key)) {
                    map.set(key, { salesPerson: sp && sp !== "-" ? sp : "-", hpp: price, taxRate: tax });
                }
                if (!map.has(item.productId)) {
                    map.set(item.productId, { salesPerson: sp && sp !== "-" ? sp : "-", hpp: price, taxRate: tax });
                }
            }
        }
        return map;
    }, [unverifiedReceipts]);

    // Safe, O(1) metadata lookup without nested array searches
    const getStockMetadata = (productId: string, warehouseId: string, vendorName: string) => {
        const prod = initialProducts.find((p: any) => p.id === productId);
        const vKey = String(vendorName || "CIBINONG").trim().toLowerCase();
        const stock = (prod?.stocks || []).find((s: any) =>
            s.warehouseId === warehouseId &&
            String(s.vendorName || "CIBINONG").trim().toLowerCase() === vKey
        );

        if (stock && stock.salesPerson && stock.salesPerson !== "-") {
            return {
                salesPerson: stock.salesPerson,
                hpp: Number(stock.hpp || prod?.purchasePrice || 0),
                taxRate: Number(stock.taxRate || 0)
            };
        }

        const fallback = receiptMetaMap.get(`${productId}_${vKey}`) || receiptMetaMap.get(productId);
        return {
            salesPerson: fallback?.salesPerson || stock?.salesPerson || "-",
            hpp: fallback?.hpp || Number(stock?.hpp || prod?.purchasePrice || 0),
            taxRate: fallback?.taxRate || Number(stock?.taxRate || 0)
        };
    };

    // Extract unique sales persons safely
    const availableSales = useMemo(() => {
        const set = new Set<string>(["BC", "PF", "OWEN"]);
        initialProducts.forEach((p: any) => {
            (p.stocks || []).forEach((s: any) => {
                const sp = String(s.salesPerson || "").trim();
                if (sp && sp !== "-") set.add(sp);
            });
        });
        (unverifiedReceipts || []).forEach((r: any) => {
            const sp = String(r?.salesPerson || "").trim();
            if (sp && sp !== "-") set.add(sp);
        });
        return Array.from(set).sort();
    }, [initialProducts, unverifiedReceipts]);

    // Precalculate net quantities per product matching active warehouse, vendor, and sales filters
    const productQtyMap = useMemo(() => {
        const map = new Map<string, number>();
        for (const p of initialProducts) {
            let total = 0;
            for (const s of (p.stocks || [])) {
                if (warehouseFilter !== "ALL" && s.warehouseId !== warehouseFilter) continue;
                if (vendorFilter !== "ALL" && String(s.vendorName || "CIBINONG").trim().toLowerCase() !== vendorFilter.trim().toLowerCase()) continue;
                if (salesFilter !== "ALL") {
                    const sp = s.salesPerson || getStockMetadata(p.id, s.warehouseId, s.vendorName).salesPerson;
                    if (sp !== salesFilter) continue;
                }
                total += Number(s.quantity || 0);
            }
            map.set(p.id, total);
        }
        return map;
    }, [initialProducts, warehouseFilter, vendorFilter, salesFilter, receiptMetaMap]);

    // Single-pass statistical overview of inventory
    const stockStats = useMemo(() => {
        let minus = 0;
        let low = 0;
        let inStock = 0;
        let empty = 0;

        for (const p of initialProducts) {
            const stocks = p.stocks || [];
            const total = stocks.reduce((sum: number, s: any) => sum + Number(s.quantity || 0), 0);
            const hasNeg = stocks.some((s: any) => Number(s.quantity || 0) < 0);
            const threshold = Number(p.lowStockThreshold || 10);

            if (hasNeg || total < 0) {
                minus++;
            }
            if (total > 0 && total <= threshold) {
                low++;
            }
            if (total > 0) {
                inStock++;
            }
            if (total === 0) {
                empty++;
            }
        }

        return { minus, low, inStock, empty };
    }, [initialProducts]);

    const minusCount = stockStats.minus;
    const lowStockCount = stockStats.low;

    const isFiltered = Boolean(
        searchTerm.trim() !== "" ||
        warehouseFilter !== "ALL" ||
        statusFilter !== "ALL" ||
        categoryFilter !== "ALL" ||
        vendorFilter !== "ALL" ||
        salesFilter !== "ALL" ||
        sortBy !== "STOCK_FIRST"
    );

    const resetFilters = () => {
        setSearchTerm("");
        setWarehouseFilter("ALL");
        setStatusFilter("ALL");
        setCategoryFilter("ALL");
        setVendorFilter("ALL");
        setSalesFilter("ALL");
        setSortBy("STOCK_FIRST");
    };

    const toggleAllExpand = () => {
        if (allExpanded) {
            setExpandedProducts({});
            setAllExpanded(false);
        } else {
            const newExpanded: Record<string, boolean> = {};
            filteredProducts.forEach(p => {
                newExpanded[p.id] = true;
            });
            setExpandedProducts(newExpanded);
            setAllExpanded(true);
        }
    };

    const filteredProducts = useMemo(() => {
        const list = initialProducts.filter(p => {
            // 1. Text Search (SKU, Name, Barcode)
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                const matchSku = (p.sku || "").toLowerCase().includes(term);
                const matchName = (p.name || "").toLowerCase().includes(term);
                const matchBarcode = (p.barcode || "").toLowerCase().includes(term);
                if (!matchSku && !matchName && !matchBarcode) return false;
            }

            // 2. Category Filter
            if (categoryFilter !== "ALL") {
                const pCat = (p.category || "").trim().toUpperCase();
                if (pCat !== categoryFilter) return false;
            }

            const allStocks = p.stocks || [];

            // 3. Warehouse Filter
            if (warehouseFilter !== "ALL") {
                const hasWh = allStocks.some((s: any) => s.warehouseId === warehouseFilter);
                if (!hasWh) return false;
            }

            // 4. Vendor Filter
            if (vendorFilter !== "ALL") {
                const hasVendor = allStocks.some((s: any) =>
                    String(s.vendorName || "CIBINONG").trim().toLowerCase() === vendorFilter.trim().toLowerCase()
                );
                if (!hasVendor) return false;
            }

            // 5. Sales Filter
            if (salesFilter !== "ALL") {
                const hasSales = allStocks.some((s: any) => {
                    const sp = s.salesPerson || getStockMetadata(p.id, s.warehouseId, s.vendorName).salesPerson;
                    return sp === salesFilter;
                });
                if (!hasSales) return false;
            }

            // 6. Status Filter
            if (statusFilter !== "ALL") {
                const totalQty = productQtyMap.get(p.id) ?? 0;
                const relevantStocks = allStocks.filter((s: any) => {
                    if (warehouseFilter !== "ALL" && s.warehouseId !== warehouseFilter) return false;
                    if (vendorFilter !== "ALL" && String(s.vendorName || "CIBINONG").trim().toLowerCase() !== vendorFilter.trim().toLowerCase()) return false;
                    if (salesFilter !== "ALL") {
                        const sp = s.salesPerson || getStockMetadata(p.id, s.warehouseId, s.vendorName).salesPerson;
                        if (sp !== salesFilter) return false;
                    }
                    return true;
                });

                const hasNegativeStock = relevantStocks.some((s: any) => Number(s.quantity || 0) < 0);
                const threshold = Number(p.lowStockThreshold || 10);

                if (statusFilter === "IN_STOCK") {
                    if (totalQty <= 0) return false;
                } else if (statusFilter === "MINUS") {
                    if (!hasNegativeStock && totalQty >= 0) return false;
                } else if (statusFilter === "LOW_STOCK") {
                    if (totalQty <= 0 || totalQty > threshold) return false;
                } else if (statusFilter === "OUT_OF_STOCK") {
                    if (totalQty !== 0 && relevantStocks.length > 0) return false;
                }
            }

            return true;
        });

        // 7. Sort products based on sortBy (Default: Ada Stok Duluan)
        return list.sort((a, b) => {
            const qtyA = productQtyMap.get(a.id) ?? 0;
            const qtyB = productQtyMap.get(b.id) ?? 0;

            if (sortBy === "STOCK_FIRST") {
                // Products that have stock (> 0) come first
                if (qtyA > 0 && qtyB <= 0) return -1;
                if (qtyA <= 0 && qtyB > 0) return 1;
                // Among products with stock, order by quantity descending
                if (qtyA > 0 && qtyB > 0) return qtyB - qtyA;
                // For zero and minus items, put zero before minus
                if (qtyA === 0 && qtyB < 0) return -1;
                if (qtyA < 0 && qtyB === 0) return 1;
                if (qtyA < 0 && qtyB < 0) return qtyA - qtyB;
                return (a.name || "").localeCompare(b.name || "");
            }

            if (sortBy === "QTY_DESC") {
                if (qtyA !== qtyB) return qtyB - qtyA;
                return (a.name || "").localeCompare(b.name || "");
            }

            if (sortBy === "QTY_ASC") {
                if (qtyA !== qtyB) return qtyA - qtyB;
                return (a.name || "").localeCompare(b.name || "");
            }

            if (sortBy === "NAME_ASC") {
                return (a.name || "").localeCompare(b.name || "");
            }

            if (sortBy === "SKU_ASC") {
                return (a.sku || "").localeCompare(b.sku || "");
            }

            return 0;
        });
    }, [initialProducts, searchTerm, warehouseFilter, statusFilter, categoryFilter, vendorFilter, salesFilter, sortBy, productQtyMap]);

    const handleDeleteProduct = async (id: string) => {
        if (!confirm("Hapus produk ini? Semua data stok terkait juga akan dihapus.")) return;
        try {
            await callAction("deleteProduct", id);
            alert("Produk berhasil dihapus");

            window.location.reload();
        } catch (e: any) {
            alert(e.message || "Gagal menghapus produk");
        }
    };

    const handleExport = () => {
        if (activeTab === "inventory") {
            const data = filteredProducts.flatMap(p =>
                (p.stocks || [])
                    .filter((s: any) => {
                        if (warehouseFilter !== "ALL" && s.warehouseId !== warehouseFilter) return false;
                        if (vendorFilter !== "ALL" && String(s.vendorName || "CIBINONG").trim().toLowerCase() !== vendorFilter.trim().toLowerCase()) return false;
                        if (salesFilter !== "ALL") {
                            const sp = s.salesPerson || getStockMetadata(p.id, s.warehouseId, s.vendorName).salesPerson;
                            if (sp !== salesFilter) return false;
                        }
                        if (statusFilter === "MINUS") return Number(s.quantity || 0) < 0;
                        if (statusFilter === "OUT_OF_STOCK") return Number(s.quantity || 0) === 0;
                        return Number(s.quantity || 0) !== 0;
                    })
                    .map((s: any) => {
                        const meta = getStockMetadata(p.id, s.warehouseId, s.vendorName);
                        const hpp = Math.round(s.hpp || meta.hpp || Number(p.purchasePrice) || 0);
                        const salesPerson = s.salesPerson || meta.salesPerson || "-";
                        return {
                            'SKU': p.sku,
                            'Barcode': p.barcode || "-",
                            'Nama Barang': p.name,
                            'Kategori': p.category || "-",
                            'Vendor / PT': s.vendorName || "CIBINONG",
                            'Gudang': warehouses.find(w => w.id === s.warehouseId)?.name || 'Unknown',
                            'Sales Person': salesPerson,
                            'Satuan': p.uom,
                            'Total Stok': s.quantity,
                            'HPP (DPP)': hpp,
                            'PPN (%)': meta.taxRate || 0,
                            'HPP + PPN': Math.round(hpp * (1 + ((meta.taxRate || 0) / 100))),
                            'Total Nilai (Inc. Tax)': Math.round((s.quantity || 0) * (hpp * (1 + ((meta.taxRate || 0) / 100)))),
                            'Threshold': p.lowStockThreshold,
                            'Status': s.quantity < 0 ? 'MINUS' : s.quantity <= p.lowStockThreshold ? 'LOW' : 'NORMAL'
                        };
                    })
            );
            exportToExcel(data, `Laporan_Stok_Gudang_${format(new Date(), "yyyyMMdd")}`, 'Inventory');
        } else {
            // Detailed LPB Export: Exports each receipt item, its quantity, and UOM/Unit, including HPP
            const data: any[] = [];
            unverifiedReceipts.forEach(r => {
                const items = r.items || [];
                items.forEach((item: any) => {
                    data.push({
                        'Tanggal': format(new Date(r.createdAt), "yyyy-MM-dd HH:mm"),
                        'No. LPB': r.receiptNumber,
                        'Supplier': r.receivedFrom,
                        'Gudang': r.warehouse?.name || "-",
                        'Sales Person': r.salesPerson || "-",
                        'SKU': item.product?.sku || "-",
                        'Nama Barang': item.product?.name || "-",
                        'Qty': item.quantity || 0,
                        'Satuan': item.uom || item.product?.uom || "-",
                        'HPP (DPP)': Number(item.purchasePrice) || 0,
                        'PPN (%)': Number(r.taxRate) || 0,
                        'HPP + PPN': (Number(item.purchasePrice) || 0) * (1 + ((Number(r.taxRate) || 0) / 100)),
                        'Total Nilai (Inc. Tax)': (item.quantity || 0) * ((Number(item.purchasePrice) || 0) * (1 + ((Number(r.taxRate) || 0) / 100))),
                        'Status': r.isVerified ? 'VERIFIED' : 'PENDING',
                        'Penerima': r.createdBy?.name || '-'
                    });
                });
            });
            exportToExcel(data, 'Laporan_Penerimaan_Barang_Detail_Gudang', 'Penerimaan');
        }
    };

    const handlePreview = () => {
        if (activeTab === "inventory") {
            const data = filteredProducts.flatMap(p =>
                (p.stocks || [])
                    .filter((s: any) => {
                        if (warehouseFilter !== "ALL" && s.warehouseId !== warehouseFilter) return false;
                        if (vendorFilter !== "ALL" && String(s.vendorName || "CIBINONG").trim().toLowerCase() !== vendorFilter.trim().toLowerCase()) return false;
                        if (salesFilter !== "ALL") {
                            const sp = s.salesPerson || getStockMetadata(p.id, s.warehouseId, s.vendorName).salesPerson;
                            if (sp !== salesFilter) return false;
                        }
                        if (statusFilter === "MINUS") return Number(s.quantity || 0) < 0;
                        if (statusFilter === "OUT_OF_STOCK") return Number(s.quantity || 0) === 0;
                        return Number(s.quantity || 0) !== 0;
                    })
                    .map((s: any) => {
                        const meta = getStockMetadata(p.id, s.warehouseId, s.vendorName);
                        const hpp = Math.round(s.hpp || meta.hpp || Number(p.purchasePrice) || 0);
                        const salesPerson = s.salesPerson || meta.salesPerson || "-";
                        return {
                            'SKU': p.sku,
                            'Nama Barang': p.name,
                            'Kategori': p.category || "-",
                            'Vendor / PT': s.vendorName || "CIBINONG",
                            'Gudang': warehouses.find(w => w.id === s.warehouseId)?.name || 'Unknown',
                            'Sales Person': salesPerson,
                            'Satuan': p.uom,
                            'Total Stok': s.quantity,
                            'HPP (DPP)': hpp,
                            'PPN (%)': meta.taxRate || 0,
                            'HPP + PPN': hpp * (1 + ((meta.taxRate || 0) / 100)),
                            'Total Nilai (Inc. Tax)': (s.quantity || 0) * (hpp * (1 + ((meta.taxRate || 0) / 100))),
                            'Threshold': p.lowStockThreshold,
                            'Status': s.quantity < 0 ? 'MINUS' : s.quantity <= p.lowStockThreshold ? 'LOW' : 'NORMAL'
                        };
                    })
            );
            setPreviewData(data);
            setPreviewTitle("Laporan Master Stok Gudang (Berdasarkan Vendor)");
        } else {
            // Detailed Preview for receipts, including HPP
            const data: any[] = [];
            unverifiedReceipts.forEach(r => {
                const items = r.items || [];
                items.forEach((item: any) => {
                    data.push({
                        'Tanggal': format(new Date(r.createdAt), "yyyy-MM-dd HH:mm"),
                        'No. LPB': r.receiptNumber,
                        'Supplier': r.receivedFrom,
                        'Gudang': r.warehouse?.name || "-",
                        'Sales Person': r.salesPerson || "-",
                        'SKU': item.product?.sku || "-",
                        'Nama Barang': item.product?.name || "-",
                        'Qty': item.quantity || 0,
                        'Satuan': item.uom || item.product?.uom || "-",
                        'HPP (DPP)': Number(item.purchasePrice) || 0,
                        'PPN (%)': Number(r.taxRate) || 0,
                        'HPP + PPN': (Number(item.purchasePrice) || 0) * (1 + ((Number(r.taxRate) || 0) / 100)),
                        'Total Nilai (Inc. Tax)': (item.quantity || 0) * ((Number(item.purchasePrice) || 0) * (1 + ((Number(r.taxRate) || 0) / 100))),
                        'Status': r.isVerified ? 'VERIFIED' : 'PENDING'
                    });
                });
            });
            setPreviewData(data);
            setPreviewTitle("Laporan Detail Penerimaan Barang (Gudang)");
        }
        setShowPreview(true);
    };

    return (
        <div className="space-y-8 pb-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2 py-4 bg-gradient-to-r from-slate-900/5 to-transparent rounded-3xl border border-slate-100">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-950 text-white rounded-2xl shadow-xl shadow-slate-950/10">
                        <WarehouseIcon className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 uppercase">
                            Warehouse
                        </h2>
                        <p className="text-slate-500 font-bold text-[10px] md:text-xs tracking-wider uppercase opacity-70">Inventory & Stock Distribution</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={() => setShowInputModal(true)}
                        className="w-full md:w-auto bg-slate-900 text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all font-bold shadow-lg shadow-slate-900/10 hover:shadow-slate-900/20 active:scale-98 group text-xs uppercase tracking-wider"
                    >
                        <Plus className="h-4 w-4 text-emerald-400 group-hover:rotate-90 transition-transform duration-300" />
                        <span>Stock Entry</span>
                    </button>
                </div>
            </div>

            {/* Control Panel: Navigation & Actions */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200/80 p-3 rounded-[1.5rem] shadow-sm">
                {/* Tabs Selector */}
                <div className="flex bg-slate-100/80 p-1 rounded-2xl w-full lg:w-fit gap-1">
                    <button
                        onClick={() => setActiveTab("inventory")}
                        className={cn(
                            "flex-1 lg:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300",
                            activeTab === "inventory"
                                ? "bg-white text-slate-900 shadow-md scale-102"
                                : "text-slate-500 hover:text-slate-800"
                        )}
                    >
                        <Box className={cn("h-4 w-4", activeTab === "inventory" ? "text-slate-900" : "text-slate-400")} />
                        <span>Inventory</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("checker")}
                        className={cn(
                            "flex-1 lg:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300",
                            activeTab === "checker"
                                ? "bg-white text-slate-900 shadow-md scale-102"
                                : "text-slate-500 hover:text-slate-800"
                        )}
                    >
                        <Layers className={cn("h-4 w-4", activeTab === "checker" ? "text-slate-900" : "text-slate-400")} />
                        <span>Checker</span>
                    </button>
                </div>

                {/* Actions Toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                    <Link
                        href="/warehouse/jadwal-pengiriman"
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs uppercase tracking-wider transition-all shadow-xs"
                    >
                        <Truck className="h-4 w-4 text-amber-600" />
                        <span>Jadwal Pengiriman</span>
                    </Link>
                    <Link
                        href="/warehouse/print-form-harian"
                        target="_blank"
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs uppercase tracking-wider transition-all"
                    >
                        <FileText className="h-4 w-4 text-slate-500" />
                        <span className="hidden sm:inline">Rekap Harian</span>
                    </Link>
                    <Link
                        href="/warehouse/print-database"
                        target="_blank"
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs uppercase tracking-wider transition-all"
                    >
                        <FileText className="h-4 w-4 text-slate-500" />
                        <span>Cetak DB</span>
                    </Link>

                    <button
                        onClick={() => {
                            setSelectedProductIdForCard(undefined);
                            setShowStockCard(true);
                        }}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs uppercase tracking-wider transition-all"
                    >
                        <FileText className="h-4 w-4 text-slate-500" />
                        <span>Kartu Stok</span>
                    </button>

                    <button
                        onClick={handlePreview}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs uppercase tracking-wider transition-all"
                        title="Preview Report"
                    >
                        <Eye className="h-4 w-4 text-slate-500" />
                        <span>Preview</span>
                    </button>

                    <button
                        onClick={handleExport}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/50 text-emerald-800 font-bold text-xs uppercase tracking-wider transition-all shadow-sm shadow-emerald-500/5 hover:shadow-md"
                    >
                        <Download className="h-4 w-4 text-emerald-600" />
                        <span>Export Excel</span>
                    </button>
                </div>
            </div>

            <DashboardStats />

            {activeTab === "checker" ? (
                <ErrorBoundary fallbackTitle="Checker Module Error">
                    <CheckerBoard unverifiedReceipts={unverifiedReceipts} />
                </ErrorBoundary>
            ) : (
                <>
                    <div className="grid gap-6 md:grid-cols-4">
                        <div className="md:col-span-3 space-y-6">
                            {/* Warehouse Occupancy Indicators */}
                            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                                {warehouses.map((w) => {
                                    const totalStock = initialProducts.reduce((acc: number, p: any) => acc + p.stocks.filter((s: any) => s.warehouseId === w.id).reduce((sacc: number, s: any) => sacc + s.quantity, 0), 0);
                                    const capacity = 5000; // Placeholder capacity
                                    const percentage = Math.min(Math.round((totalStock / capacity) * 100), 100);

                                    return (
                                        <div key={w.id} className="p-5 rounded-2xl border border-slate-200/70 bg-white hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between items-center mb-3">
                                                    <div className="p-2 bg-slate-100 text-slate-700 rounded-xl group-hover:bg-slate-900 group-hover:text-white transition-colors duration-300">
                                                        <WarehouseIcon className="h-4 w-4" />
                                                    </div>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100">Capacity</span>
                                                </div>
                                                <h4 className="font-extrabold text-slate-900 text-sm truncate mb-0.5">{w.name}</h4>
                                                <p className="text-[10px] text-slate-400 font-semibold mb-4 uppercase tracking-tight truncate">{w.location || "Gudang Utama"}</p>
                                            </div>

                                            <div className="space-y-2 mt-auto">
                                                <div className="flex justify-between items-baseline">
                                                    <span className="text-xl font-mono font-black text-slate-900 leading-none">{isClient ? totalStock.toLocaleString() : "..."}</span>
                                                    <span className="text-[10px] font-extrabold text-slate-400">{percentage}% Full</span>
                                                </div>
                                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-full transition-all duration-1000 rounded-full",
                                                            percentage > 90 
                                                                ? "bg-gradient-to-r from-rose-500 to-red-600" 
                                                                : percentage > 70 
                                                                    ? "bg-gradient-to-r from-amber-500 to-orange-500" 
                                                                    : "bg-gradient-to-r from-emerald-500 to-teal-500"
                                                        )}
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Master Stock Section */}
                            <div className="bg-white border border-slate-200/90 rounded-2xl md:rounded-3xl shadow-xs overflow-hidden md:min-h-[600px]">
                                {/* Professional Filter & Control Bar */}
                                <div className="p-4 md:p-5 border-b border-slate-200/70 bg-white space-y-3.5">
                                    {/* Top Row: Title & Quick Segmented Status Tabs */}
                                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Master Stock</h3>
                                                <span className="text-xs font-semibold text-slate-400">
                                                    ({filteredProducts.length.toLocaleString("id-ID")} produk)
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 font-medium">
                                                Monitoring posisi stok barang real-time per gudang dan vendor pemasok.
                                            </p>
                                        </div>

                                        {/* Quick Status Tabs (Linear/Shopify style) */}
                                        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 self-start xl:self-auto">
                                            <button
                                                onClick={() => setStatusFilter("ALL")}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                                    statusFilter === "ALL"
                                                        ? "bg-white text-slate-900 shadow-xs"
                                                        : "text-slate-600 hover:text-slate-900"
                                                )}
                                            >
                                                Semua ({initialProducts.length})
                                            </button>

                                            <button
                                                onClick={() => setStatusFilter("IN_STOCK")}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                                                    statusFilter === "IN_STOCK"
                                                        ? "bg-emerald-600 text-white shadow-xs"
                                                        : "text-slate-600 hover:text-emerald-700 hover:bg-white/50"
                                                )}
                                            >
                                                <span>Ada Stok</span>
                                                <span className={cn(
                                                    "px-1.5 py-0.2 rounded-full text-[10px] font-extrabold",
                                                    statusFilter === "IN_STOCK" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
                                                )}>
                                                    {stockStats.inStock}
                                                </span>
                                            </button>

                                            <button
                                                onClick={() => setStatusFilter("MINUS")}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                                                    statusFilter === "MINUS"
                                                        ? "bg-rose-600 text-white shadow-xs"
                                                        : minusCount > 0
                                                            ? "text-rose-700 bg-rose-50/80 hover:bg-rose-100"
                                                            : "text-slate-600 hover:text-slate-900"
                                                )}
                                            >
                                                <span>Stok Minus</span>
                                                {minusCount > 0 && (
                                                    <span className={cn(
                                                        "px-1.5 py-0.2 rounded-full text-[10px] font-extrabold",
                                                        statusFilter === "MINUS" ? "bg-white/20 text-white" : "bg-rose-200 text-rose-800"
                                                    )}>
                                                        {minusCount}
                                                    </span>
                                                )}
                                            </button>

                                            <button
                                                onClick={() => setStatusFilter("LOW_STOCK")}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                                                    statusFilter === "LOW_STOCK"
                                                        ? "bg-amber-500 text-white shadow-xs"
                                                        : "text-slate-600 hover:text-amber-700 hover:bg-white/50"
                                                )}
                                            >
                                                <span>Menipis</span>
                                                {lowStockCount > 0 && (
                                                    <span className={cn(
                                                        "px-1.5 py-0.2 rounded-full text-[10px] font-extrabold",
                                                        statusFilter === "LOW_STOCK" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"
                                                    )}>
                                                        {lowStockCount}
                                                    </span>
                                                )}
                                            </button>

                                            <button
                                                onClick={() => setStatusFilter("OUT_OF_STOCK")}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                                                    statusFilter === "OUT_OF_STOCK"
                                                        ? "bg-slate-800 text-white shadow-xs"
                                                        : "text-slate-600 hover:text-slate-900"
                                                )}
                                            >
                                                <span>Kosong</span>
                                                <span className={cn(
                                                    "px-1.5 py-0.2 rounded-full text-[10px] font-extrabold",
                                                    statusFilter === "OUT_OF_STOCK" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                                                )}>
                                                    {stockStats.empty}
                                                </span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Second Row: Search & Structured Controls (Strict 1-Line Row) */}
                                    <div className="flex items-center gap-1.5 xl:gap-2 pt-1 border-t border-slate-100 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                        {/* Search Input */}
                                        <div className="relative flex-1 min-w-[130px] md:min-w-[160px] shrink">
                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                            <input
                                                value={searchTerm}
                                                onChange={e => setSearchTerm(e.target.value)}
                                                placeholder="Cari nama, SKU, barcode..."
                                                className="w-full h-8 pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 outline-none transition-all"
                                            />
                                            {searchTerm && (
                                                <button
                                                    onClick={() => setSearchTerm("")}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                                                    title="Bersihkan pencarian"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Dropdown Gudang */}
                                        <select
                                            value={warehouseFilter}
                                            onChange={e => setWarehouseFilter(e.target.value)}
                                            className={cn(
                                                "h-8 px-2.5 py-1 bg-slate-50 border rounded-lg text-xs font-semibold outline-none cursor-pointer transition-all shrink-0 max-w-[130px] truncate",
                                                warehouseFilter !== "ALL"
                                                    ? "border-slate-800 text-slate-900 bg-white ring-1 ring-slate-800/10"
                                                    : "border-slate-200 text-slate-600 hover:border-slate-300 focus:bg-white"
                                            )}
                                            title="Filter Gudang"
                                        >
                                            <option value="ALL">Gudang: Semua</option>
                                            {warehouses.map(w => (
                                                <option key={w.id} value={w.id}>
                                                    Gudang: {w.name}
                                                </option>
                                            ))}
                                        </select>

                                        {/* Dropdown Kategori */}
                                        {availableCategories.length > 0 && (
                                            <select
                                                value={categoryFilter}
                                                onChange={e => setCategoryFilter(e.target.value)}
                                                className={cn(
                                                    "h-8 px-2.5 py-1 bg-slate-50 border rounded-lg text-xs font-semibold outline-none cursor-pointer transition-all shrink-0 max-w-[130px] truncate",
                                                    categoryFilter !== "ALL"
                                                        ? "border-slate-800 text-slate-900 bg-white ring-1 ring-slate-800/10"
                                                        : "border-slate-200 text-slate-600 hover:border-slate-300 focus:bg-white"
                                                )}
                                                title="Filter Kategori"
                                            >
                                                <option value="ALL">Kategori: Semua</option>
                                                {availableCategories.map(cat => (
                                                    <option key={cat} value={cat}>
                                                        Kategori: {cat}
                                                    </option>
                                                ))}
                                            </select>
                                        )}

                                        {/* Dropdown Vendor */}
                                        {availableVendors.length > 0 && (
                                            <select
                                                value={vendorFilter}
                                                onChange={e => setVendorFilter(e.target.value)}
                                                className={cn(
                                                    "h-8 px-2.5 py-1 bg-slate-50 border rounded-lg text-xs font-semibold outline-none cursor-pointer transition-all shrink-0 max-w-[135px] truncate",
                                                    vendorFilter !== "ALL"
                                                        ? "border-slate-800 text-slate-900 bg-white ring-1 ring-slate-800/10"
                                                        : "border-slate-200 text-slate-600 hover:border-slate-300 focus:bg-white"
                                                )}
                                                title="Filter Vendor / Pemasok"
                                            >
                                                <option value="ALL">Vendor: Semua</option>
                                                {availableVendors.map(v => (
                                                    <option key={v} value={v}>
                                                        Vendor: {v}
                                                    </option>
                                                ))}
                                            </select>
                                        )}

                                        {/* Dropdown Sales */}
                                        {availableSales.length > 0 && (
                                            <select
                                                value={salesFilter}
                                                onChange={e => setSalesFilter(e.target.value)}
                                                className={cn(
                                                    "h-8 px-2.5 py-1 bg-slate-50 border rounded-lg text-xs font-semibold outline-none cursor-pointer transition-all shrink-0 max-w-[110px]",
                                                    salesFilter !== "ALL"
                                                        ? "border-slate-800 text-slate-900 bg-white ring-1 ring-slate-800/10"
                                                        : "border-slate-200 text-slate-600 hover:border-slate-300 focus:bg-white"
                                                )}
                                                title="Filter Sales"
                                            >
                                                <option value="ALL">Sales: Semua</option>
                                                {availableSales.map(s => (
                                                    <option key={s} value={s}>
                                                        Sales: {s}
                                                    </option>
                                                ))}
                                            </select>
                                        )}

                                        {/* Dropdown Sortir */}
                                        <select
                                            value={sortBy}
                                            onChange={e => setSortBy(e.target.value as any)}
                                            className={cn(
                                                "h-8 px-2.5 py-1 bg-slate-50 border rounded-lg text-xs font-semibold outline-none cursor-pointer transition-all shrink-0 max-w-[155px] truncate",
                                                sortBy !== "STOCK_FIRST"
                                                    ? "border-slate-800 text-slate-900 bg-white ring-1 ring-slate-800/10"
                                                    : "border-slate-200 text-slate-600 hover:border-slate-300 focus:bg-white"
                                            )}
                                            title="Urutkan tampilan Master Stock"
                                        >
                                            <option value="STOCK_FIRST">Sortir: Ada Stok</option>
                                            <option value="QTY_DESC">Sortir: Terbanyak</option>
                                            <option value="QTY_ASC">Sortir: Terendah/Minus</option>
                                            <option value="NAME_ASC">Sortir: Nama (A-Z)</option>
                                            <option value="SKU_ASC">Sortir: SKU (A-Z)</option>
                                        </select>

                                        {/* Action: Buka / Tutup Rincian */}
                                        <button
                                            onClick={toggleAllExpand}
                                            className="h-8 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap shadow-2xs"
                                            title={allExpanded ? "Tutup Semua Rincian Sub-Stok" : "Buka Semua Rincian Sub-Stok"}
                                        >
                                            {allExpanded ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />}
                                            <span>{allExpanded ? "Tutup Rincian" : "Buka Sub-Stok"}</span>
                                        </button>

                                        {/* Action: Reset Filter */}
                                        {isFiltered && (
                                            <button
                                                onClick={resetFilters}
                                                className="h-8 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 shrink-0 whitespace-nowrap"
                                                title="Reset semua filter"
                                            >
                                                <RotateCcw className="h-3 w-3" />
                                                <span>Reset</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* DESKTOP TABLE VIEW */}
                                <div className="hidden lg:block overflow-auto max-h-[calc(100vh-420px)] min-h-[400px] custom-scrollbar border-b border-slate-100">
                                    <table className="w-full text-xs text-left min-w-[1200px] table-fixed relative">
                                        <thead className="bg-slate-100/80 text-slate-700 border-b border-slate-200 sticky top-0 z-20 shadow-2xs">
                                            <tr>
                                                <th className="px-6 py-3.5 uppercase text-[9.5px] font-extrabold tracking-wider w-64 text-slate-700">Barang / SKU</th>
                                                <th className="px-6 py-3.5 uppercase text-[9.5px] font-extrabold tracking-wider text-left w-40 text-slate-700">Gudang</th>
                                                <th className="px-6 py-3.5 uppercase text-[9.5px] font-extrabold tracking-wider text-left w-48 text-slate-700">Vendor / Pemasok</th>
                                                <th className="px-6 py-3.5 uppercase text-[9.5px] font-extrabold tracking-wider text-center w-28 text-slate-700">Sales</th>
                                                <th className="px-6 py-3.5 uppercase text-[9.5px] font-extrabold tracking-wider text-right w-36 text-slate-700">Qty Tersedia</th>
                                                <th className="px-6 py-3.5 uppercase text-[9.5px] font-extrabold tracking-wider text-right w-36 text-slate-700">HPP per Unit</th>
                                                <th className="px-6 py-3.5 uppercase text-[9.5px] font-extrabold tracking-wider text-right w-36 text-slate-700">Total Nilai</th>
                                                <th className="px-6 py-3.5 uppercase text-[9.5px] font-extrabold tracking-wider text-right w-28 text-slate-700">Status</th>
                                                {isAdmin && <th className="px-6 py-3.5 uppercase text-[9.5px] font-extrabold tracking-wider text-center w-24 text-slate-700">Aksi</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredProducts.map((p: any) => {
                                                const matchingStocks = (p.stocks || []).filter((s: any) => {
                                                    if (warehouseFilter !== "ALL" && s.warehouseId !== warehouseFilter) return false;
                                                    if (vendorFilter !== "ALL" && String(s.vendorName || "CIBINONG").trim().toLowerCase() !== vendorFilter.trim().toLowerCase()) return false;
                                                    if (salesFilter !== "ALL") {
                                                        const sp = s.salesPerson || getStockMetadata(p.id, s.warehouseId, s.vendorName).salesPerson;
                                                        if (sp !== salesFilter) return false;
                                                    }
                                                    return true;
                                                });

                                                const activeStocks = statusFilter === "OUT_OF_STOCK"
                                                    ? matchingStocks.filter((s: any) => Number(s.quantity || 0) === 0)
                                                    : statusFilter === "MINUS"
                                                        ? matchingStocks.filter((s: any) => Number(s.quantity || 0) < 0)
                                                        : statusFilter === "LOW_STOCK"
                                                            ? matchingStocks.filter((s: any) => Number(s.quantity || 0) > 0 && Number(s.quantity || 0) <= Number(p.lowStockThreshold || 10))
                                                            : matchingStocks.filter((s: any) => Number(s.quantity || 0) !== 0);

                                                const totalNetQty = productQtyMap.get(p.id) ?? 
                                                    matchingStocks.reduce((sum: number, s: any) => sum + Number(s.quantity || 0), 0);
                                                const hasSubStocks = activeStocks.length > 0;
                                                const isExpanded = Boolean(expandedProducts[p.id] && hasSubStocks);
                                                const hasNegative = matchingStocks.some((s: any) => Number(s.quantity || 0) < 0);
                                                
                                                return (
                                                    <React.Fragment key={p.id}>
                                                        {/* Parent Row (Product Level) */}
                                                        <tr 
                                                            className={cn(
                                                                "transition-colors",
                                                                hasSubStocks ? "hover:bg-slate-50/80 cursor-pointer" : "cursor-default",
                                                                isExpanded ? "bg-slate-50/90" : "bg-white"
                                                            )}
                                                            onClick={() => {
                                                                if (hasSubStocks) toggleProduct(p.id);
                                                            }}
                                                        >
                                                            <td className="px-6 py-3.5" colSpan={4}>
                                                                <div className="flex items-center gap-3">
                                                                    {hasSubStocks ? (
                                                                        <div className="p-1 bg-white shadow-2xs border border-slate-200 rounded-md text-slate-500">
                                                                            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="w-5 text-center text-slate-300 font-bold text-xs">-</div>
                                                                    )}
                                                                    <div>
                                                                        <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                                                            <span>{p.name}</span>
                                                                            {hasNegative && (
                                                                                <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-2 py-0.5 rounded text-[10px] font-bold border border-rose-200">
                                                                                    <AlertTriangle className="h-3 w-3" /> Minus
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                                                                            {p.sku} {p.category ? `• ${p.category}` : ''} {hasSubStocks ? `• ${activeStocks.length} sub-stok` : ''}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-3.5 text-right">
                                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Stok</div>
                                                                <div className={cn("text-base font-mono font-extrabold", totalNetQty < 0 ? "text-rose-600" : "text-slate-900")}>
                                                                    {isClient ? totalNetQty.toLocaleString("id-ID") : "..."}
                                                                    <span className="text-[10px] text-slate-400 font-normal ml-1">{p.uom}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-3.5" colSpan={isAdmin ? 4 : 3}></td>
                                                        </tr>
                                                        
                                                        {/* Child Rows (Sub-Stock Details) */}
                                                        {isExpanded && activeStocks.map((s: any) => {
                                                            const whName = warehouses.find(w => w.id === s.warehouseId)?.name || "Unknown";
                                                            const isLow = s.quantity > 0 && s.quantity <= p.lowStockThreshold;
                                                            const isNegative = s.quantity < 0;
                                                            const meta = getStockMetadata(p.id, s.warehouseId, s.vendorName);
                                                            const salesPerson = s.salesPerson || meta.salesPerson || "-";
                                                            const hpp = Math.round(s.hpp || meta.hpp || Number(p.purchasePrice) || 0);
                                                            const totalVal = Math.round(hpp * Number(s.quantity || 0));
                                                            
                                                            return (
                                                                <tr key={`${p.id}-${s.id}`} className="bg-slate-50/40 hover:bg-slate-100/60 transition-colors group border-l-2 border-l-slate-300">
                                                                    <td className="px-6 py-2.5 pl-14 text-slate-400 text-xs font-semibold">
                                                                        Sub-Stok
                                                                    </td>
                                                                    <td className="px-6 py-2.5 text-left font-bold text-slate-700 text-xs truncate">
                                                                        {whName}
                                                                    </td>
                                                                    <td className="px-6 py-2.5 text-left text-xs text-slate-800 font-semibold truncate">
                                                                        {s.vendorName || "CIBINONG"}
                                                                    </td>
                                                                    <td className="px-6 py-2.5 text-center">
                                                                        {salesPerson !== "-" ? (
                                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                                                {salesPerson}
                                                                            </span>
                                                                        ) : <span className="text-slate-300">-</span>}
                                                                    </td>
                                                                    <td className="px-6 py-2.5 text-right font-mono font-bold text-xs">
                                                                        <span className={isNegative ? "text-rose-600 font-extrabold" : "text-slate-900"}>
                                                                            {isClient ? Number(s.quantity || 0).toLocaleString("id-ID") : "..."}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-2.5 text-right font-mono text-slate-600 text-xs">
                                                                        {formatCurrency(hpp)}
                                                                    </td>
                                                                    <td className="px-6 py-2.5 text-right font-mono font-bold text-slate-800 text-xs">
                                                                        {formatCurrency(totalVal)}
                                                                    </td>
                                                                    <td className="px-6 py-2.5 text-right">
                                                                        <span className={cn(
                                                                            "px-2 py-0.5 rounded text-[10px] font-bold border",
                                                                            isNegative ? "bg-rose-50 text-rose-700 border-rose-200" 
                                                                            : isLow ? "bg-amber-50 text-amber-700 border-amber-200" 
                                                                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                        )}>
                                                                            {isNegative ? "Minus" : isLow ? "Low Stock" : "In Stock"}
                                                                        </span>
                                                                    </td>
                                                                    {isAdmin && (
                                                                        <td className="px-6 py-2.5 text-center">
                                                                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                <button onClick={() => setSelectedStockForAdjustment({ product: p, stock: s })} className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded" title="Penyesuaian Stok"><Edit2 className="h-3.5 w-3.5" /></button>
                                                                                <button onClick={() => setSelectedStockForTransfer({ product: p, stock: s })} className="p-1 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded" title="Mutasi"><ArrowLeftRight className="h-3.5 w-3.5" /></button>
                                                                                <button onClick={() => { setSelectedProductIdForCard(p.id); setShowStockCard(true); }} className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="Kartu Stok"><FileText className="h-3.5 w-3.5" /></button>
                                                                                <button onClick={() => handleDeleteProduct(p.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="Hapus Produk"><Trash2 className="h-3.5 w-3.5" /></button>
                                                                            </div>
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                            );
                                                        })}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* MOBILE & TABLET CARD VIEW */}
                                <div className="lg:hidden divide-y divide-slate-100 overflow-y-auto max-h-[70vh] custom-scrollbar">
                                    {filteredProducts.map((p: any) => {
                                        const matchingStocks = (p.stocks || []).filter((s: any) => {
                                            if (warehouseFilter !== "ALL" && s.warehouseId !== warehouseFilter) return false;
                                            if (vendorFilter !== "ALL" && String(s.vendorName || "CIBINONG").trim().toLowerCase() !== vendorFilter.trim().toLowerCase()) return false;
                                            if (salesFilter !== "ALL") {
                                                const sp = s.salesPerson || getStockMetadata(p.id, s.warehouseId, s.vendorName).salesPerson;
                                                if (sp !== salesFilter) return false;
                                            }
                                            return true;
                                        });

                                        const activeStocks = statusFilter === "OUT_OF_STOCK"
                                            ? matchingStocks.filter((s: any) => Number(s.quantity || 0) === 0)
                                            : statusFilter === "MINUS"
                                                ? matchingStocks.filter((s: any) => Number(s.quantity || 0) < 0)
                                                : statusFilter === "LOW_STOCK"
                                                    ? matchingStocks.filter((s: any) => Number(s.quantity || 0) > 0 && Number(s.quantity || 0) <= Number(p.lowStockThreshold || 10))
                                                    : matchingStocks.filter((s: any) => Number(s.quantity || 0) !== 0);

                                        const totalNetQty = productQtyMap.get(p.id) ?? 
                                            matchingStocks.reduce((sum: number, s: any) => sum + Number(s.quantity || 0), 0);
                                        const hasSubStocks = activeStocks.length > 0;
                                        const isExpanded = Boolean(expandedProducts[p.id] && hasSubStocks);
                                        const hasNegative = matchingStocks.some((s: any) => Number(s.quantity || 0) < 0);
                                        
                                        return (
                                            <div key={p.id} className="bg-white">
                                                {/* Parent Card */}
                                                <div 
                                                    className={cn(
                                                        "p-4 flex items-center justify-between transition-colors",
                                                        hasSubStocks ? "cursor-pointer hover:bg-slate-50" : "cursor-default"
                                                    )}
                                                    onClick={() => {
                                                        if (hasSubStocks) toggleProduct(p.id);
                                                    }}
                                                >
                                                    <div className="flex-1 min-w-0 pr-4">
                                                        <div className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-1">
                                                            <div className="truncate">{p.name}</div>
                                                            {hasNegative && <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />}
                                                        </div>
                                                        <div className="text-[11px] font-mono text-slate-400">
                                                            {p.sku} {p.category ? `• ${p.category}` : ''} {hasSubStocks ? `• ${activeStocks.length} sub-stok` : ''}
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex items-center gap-3">
                                                        <div>
                                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Stok</div>
                                                            <div className={cn("text-base font-mono font-bold leading-none", totalNetQty < 0 ? "text-rose-600" : "text-slate-900")}>
                                                                {isClient ? totalNetQty.toLocaleString("id-ID") : "..."}
                                                            </div>
                                                        </div>
                                                        {hasSubStocks ? (
                                                            <div className="text-slate-400">
                                                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                            </div>
                                                        ) : (
                                                            <div className="w-4 text-slate-300">-</div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Child Cards (Details) */}
                                                {isExpanded && (
                                                    <div className="bg-slate-50/50 border-t border-slate-100 divide-y divide-slate-100">
                                                        {activeStocks.map((s: any) => {
                                                            const whName = warehouses.find(w => w.id === s.warehouseId)?.name || "Unknown";
                                                            const isLow = s.quantity > 0 && s.quantity <= p.lowStockThreshold;
                                                            const isNegative = s.quantity < 0;
                                                            const meta = getStockMetadata(p.id, s.warehouseId, s.vendorName);
                                                            const salesPerson = s.salesPerson || meta.salesPerson || "-";
                                                            const hpp = Math.round(s.hpp || meta.hpp || Number(p.purchasePrice) || 0);
                                                            
                                                            return (
                                                                <div key={`${p.id}-${s.id}`} className="p-4 pl-6 space-y-3 relative overflow-hidden">
                                                                    {isNegative && <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />}
                                                                    <div className="flex justify-between items-start gap-3">
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="font-bold text-slate-700 text-xs truncate mb-1">{whName}</div>
                                                                            <span className="inline-block px-2 py-0.5 rounded bg-white text-slate-700 text-[10px] font-bold border border-slate-200 truncate">
                                                                                {s.vendorName || "CIBINONG"}
                                                                            </span>
                                                                        </div>
                                                                        <span className={cn(
                                                                            "shrink-0 px-2 py-0.5 rounded text-[10px] font-bold border",
                                                                            isNegative ? "bg-rose-50 text-rose-700 border-rose-200"
                                                                            : isLow ? "bg-amber-50 text-amber-700 border-amber-200" 
                                                                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                        )}>
                                                                            {isNegative ? "Minus" : isLow ? "Low Stock" : "In Stock"}
                                                                        </span>
                                                                    </div>
                                                                    
                                                                    <div className="flex items-end justify-between pt-2 border-t border-slate-200/50">
                                                                        <div>
                                                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Qty Sub-Stok</div>
                                                                            <div className={cn("text-lg font-mono font-bold leading-none", isNegative ? "text-rose-600" : "text-slate-900")}>
                                                                                {isClient ? (s.quantity || 0).toLocaleString("id-ID") : "..."} 
                                                                                <span className="text-[10px] text-slate-400 font-normal ml-1">{p.uom}</span>
                                                                            </div>
                                                                        </div>
                                                                        {isAdmin && (
                                                                            <div className="flex items-center gap-1.5">
                                                                                <button onClick={() => setSelectedStockForAdjustment({ product: p, stock: s })} className="p-2 text-slate-400 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 rounded-lg shadow-2xs">
                                                                                    <Edit2 className="h-3.5 w-3.5" />
                                                                                </button>
                                                                                <button onClick={() => setSelectedStockForTransfer({ product: p, stock: s })} className="p-2 text-slate-400 hover:text-violet-600 bg-white border border-slate-200 hover:border-violet-300 rounded-lg shadow-2xs">
                                                                                    <ArrowLeftRight className="h-3.5 w-3.5" />
                                                                                </button>
                                                                                <button onClick={() => { setSelectedProductIdForCard(p.id); setShowStockCard(true); }} className="p-2 text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 hover:border-indigo-300 rounded-lg shadow-2xs">
                                                                                    <FileText className="h-3.5 w-3.5" />
                                                                                </button>
                                                                                <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-slate-400 hover:text-red-600 bg-white border border-slate-200 hover:border-red-300 rounded-lg shadow-2xs">
                                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {filteredProducts.length === 0 && (
                                    <div className="px-6 py-16 text-center flex flex-col items-center justify-center">
                                        <div className="p-3 bg-slate-100 text-slate-400 rounded-2xl mb-3">
                                            <Box className="h-8 w-8" />
                                        </div>
                                        <h4 className="text-sm font-bold text-slate-800">Tidak Ada Produk yang Cocok</h4>
                                        <p className="text-xs text-slate-400 mt-1 max-w-sm">
                                            Tidak ditemukan produk yang memenuhi kriteria pencarian atau filter yang dipilih.
                                        </p>
                                        {isFiltered && (
                                            <button
                                                onClick={resetFilters}
                                                className="mt-4 px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2"
                                            >
                                                <RotateCcw className="h-3.5 w-3.5" />
                                                <span>Reset Semua Filter</span>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Recent Movements Section */}
                        <div className="md:col-span-1 space-y-6">
                            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden h-fit">
                                <div className="p-4.5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/60">
                                    <Activity className="h-4 w-4 text-slate-600" />
                                    <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">Recent Activity</h3>
                                </div>
                                <div className="p-5 space-y-5">
                                    {movements.length === 0 ? (
                                        <p className="text-center py-10 text-slate-400 italic text-[11px]">Belum ada pergerakan stok.</p>
                                    ) : (
                                        movements.map((m: any) => (
                                            <div key={m.id} className="relative pl-5 pb-5 border-l-2 border-slate-100 last:pb-0 last:border-l-0">
                                                <div className={cn(
                                                    "absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm",
                                                    m.quantity > 0 ? "bg-emerald-500 shadow-emerald-500/20" : "bg-rose-500 shadow-rose-500/20"
                                                )} />
                                                <div className="space-y-1">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <p className="text-[10px] font-bold text-slate-800 line-clamp-1 uppercase leading-tight">{m.product?.name || "Product Deleted"}</p>
                                                        <div className={cn(
                                                            "flex items-center text-[10px] font-mono font-bold shrink-0",
                                                            m.quantity > 0 ? "text-emerald-600" : "text-rose-600"
                                                        )}>
                                                            {m.quantity > 0 ? "+" : ""}
                                                            {m.quantity || 0}
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between items-center text-[8px] font-bold text-slate-400">
                                                        <span className="uppercase tracking-tighter truncate max-w-[80px]">{m.warehouse?.name || "Unknown"}</span>
                                                        <span>{m.createdAt ? format(new Date(m.createdAt), "HH:mm") : "-"}</span>
                                                    </div>
                                                    <span className={cn(
                                                        "text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide",
                                                        m.type === "RECEIPT" || m.type?.includes("IN")
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-100/50"
                                                            : "bg-rose-50/50 text-rose-700 border-rose-100/50"
                                                    )}>{m.type}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="p-3 bg-slate-50/50 border-t border-slate-100 text-center">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">End of History</span>
                                </div>
                            </div>

                            {/* Warehouse Insight Widget */}
                            <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white shadow-xl shadow-slate-900/10 overflow-hidden relative group border border-slate-800 animate-fade-in">
                                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
                                    <WarehouseIcon className="h-32 w-32" />
                                </div>
                                <div className="relative z-10 space-y-3">
                                    <div>
                                        <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-200">Warehouse Insight</h4>
                                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-tight">Real-time stats</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] text-slate-400 font-medium">Total unit tersimpan saat ini:</p>
                                        <div className="text-3xl font-mono font-black text-white leading-none">
                                            {isClient ? initialProducts.reduce((acc: number, p: any) => acc + (p.stocks?.reduce((sacc: number, s: any) => sacc + s.quantity, 0) || 0), 0).toLocaleString() : "..."}
                                        </div>
                                    </div>
                                    <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Total Items Handled</span>
                                        <span className="bg-white/10 px-2 py-0.5 rounded text-[9px] font-bold font-mono">{initialProducts.length} SKU</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {showInputModal && <StockInputModal products={initialProducts} warehouses={warehouses} onClose={() => {
                        setShowInputModal(false);
                        window.location.reload();
                    }} />}

                    {selectedStockForAdjustment && (
                        <StockAdjustmentModal
                            product={selectedStockForAdjustment!.product}
                            stock={selectedStockForAdjustment!.stock}
                            onClose={() => {
                                setSelectedStockForAdjustment(null);
                                window.location.reload();
                            }}
                        />
                    )}

                    {selectedStockForTransfer && (
                        <StockTransferModal
                            products={initialProducts}
                            warehouses={warehouses}
                            preselectedProduct={selectedStockForTransfer.product}
                            preselectedStock={selectedStockForTransfer.stock}
                            onClose={() => setSelectedStockForTransfer(null)}
                            onSuccess={() => window.location.reload()}
                        />
                    )}
                </>
            )}

            {showPreview && (
                <ReportPreviewModal
                    title={previewTitle}
                    data={previewData}
                    onClose={() => setShowPreview(false)}
                    onExport={handleExport}
                />
            )}

            {showStockCard && (
                <StockCardModal
                    initialProductId={selectedProductIdForCard}
                    products={initialProducts}
                    warehouses={warehouses}
                    onClose={() => setShowStockCard(false)}
                />
            )}
        </div>
    );
}
