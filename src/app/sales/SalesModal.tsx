"use client";
import { useState, useEffect } from "react";
import { X, Plus, Trash2, Loader2, Save, Tag, ShoppingCart, FileCheck, Search } from "lucide-react";
import { callAction } from "@/proxy";

import { formatCurrency, cn } from "@/lib/utils";
import { useDialog } from "@/components/ui/DialogProvider";
import { useMemo } from "react";

interface SalesItem {
    productId: string;
    sku: string;
    quantity: number | string;
    salesPrice: number | string;
    discount: number | string; // Nominal discount per line
    discountPercent?: number | string; // Percentage discount per line
    uom: string;
    vendorName: string;
}

export default function SalesModal({ products, warehouses, customers, orders = [], onClose, initialData }: { products: any[], warehouses: any[], customers: any[], orders?: any[], onClose: () => void, initialData?: any }) {
    const { prompt } = useDialog();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Header
    const [recipient, setRecipient] = useState("");
    const [buyerName, setBuyerName] = useState("");
    const [warehouseId, setWarehouseId] = useState(Array.isArray(warehouses) && warehouses.length > 0 ? warehouses[0]?.id : "");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [salesPerson, setSalesPerson] = useState("");
    const [poNumber, setPoNumber] = useState("");
    const [vehicleNumber, setVehicleNumber] = useState("");
    const [isManualBuyer, setIsManualBuyer] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState(initialData?.orderId || "");

    // Body (Items)
    const [items, setItems] = useState<SalesItem[]>([{ productId: "", sku: "", quantity: 1, salesPrice: 0, discount: 0, discountPercent: "", uom: "", vendorName: "UMUM" }]);

    // Financials
    const [showDiscount, setShowDiscount] = useState(false);
    const [totalDiscount, setTotalDiscount] = useState<number | string>(0);
    const [totalDiscountPercent, setTotalDiscountPercent] = useState<number | string>("");
    const [taxRate, setTaxRate] = useState<number | "">(0);
    const [isPKP, setIsPKP] = useState(false); // false = Non-PKP (KB-TRD), true = PKP (KB-TRN)
    const [result, setResult] = useState<any>(null);

    // Helper to parse Indonesian numbers (remove dots, replace comma with dot)
    const parseIndoNumber = (val: string | number): number => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        return Number(String(val).replace(/\./g, "").replace(",", ".")) || 0;
    };

    useEffect(() => {
        if (initialData) {
            setRecipient(initialData.recipient || "");
            setBuyerName(initialData.buyerName || "");
            setWarehouseId(initialData.warehouseId || "");
            setSalesPerson(initialData.salesPerson || "");
            setDate(new Date(initialData.createdAt).toISOString().split('T')[0]);
            setPoNumber(initialData.poNumber || "");
            setTotalDiscount(Number(initialData.totalDiscount || 0));
            const initTax = Number(initialData.taxRate || 0);
            setTaxRate(initTax);
            setIsPKP(initTax > 0);
            setVehicleNumber(initialData.vehicleNumber || "");

            if (initialData.items && initialData.items.length > 0) {
                setItems(initialData.items.map((i: any) => {
                    const qty = Number(i.quantity) || 0;
                    const price = Number(i.salesPrice) || 0;
                    const discNominal = Number(i.discount || 0);
                    const gross = qty * price;
                    const discPercent = gross > 0 && discNominal > 0 ? Number(((discNominal / gross) * 100).toFixed(2)) : "";

                    return {
                        productId: i.productId,
                        sku: i.product?.sku || "",
                        quantity: i.quantity,
                        salesPrice: Number(i.salesPrice),
                        discount: discNominal,
                        discountPercent: discPercent,
                        uom: i.uom || i.product?.uom || "",
                        vendorName: i.vendorName || "UMUM"
                    };
                }));
            }
            if (Number(initialData.totalDiscount) > 0 || initialData.items.some((i: any) => Number(i.discount) > 0)) {
                setShowDiscount(true);
            }
        }
    }, [initialData]);

    const addItem = () => setItems([...items, { productId: "", sku: "", quantity: 1, salesPrice: 0, discount: 0, discountPercent: "", uom: "", vendorName: "UMUM" }]);
    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];

        // Handle numeric inputs with formatting preservation
        if (field === 'quantity' || field === 'salesPrice' || field === 'discount') {
            const userDisplayValue = String(value).replace(/[^0-9,.]/g, '');
            (newItems[index] as any)[field] = userDisplayValue;

            // Sync discount if percent exists
            if (field !== 'discount' && newItems[index].discountPercent !== "" && newItems[index].discountPercent !== undefined) {
                const qty = parseIndoNumber(newItems[index].quantity);
                const price = parseIndoNumber(newItems[index].salesPrice);
                const gross = qty * price;
                newItems[index].discount = Math.round(gross * (Number(newItems[index].discountPercent) / 100));
            }

            if (field === 'discount') {
                newItems[index].discountPercent = ""; // Clear percent when manual nominal entered
            }
        } else if (field === 'discountPercent') {
            newItems[index].discountPercent = value;
            const numVal = Number(value) || 0;
            const qty = parseIndoNumber(newItems[index].quantity);
            const price = parseIndoNumber(newItems[index].salesPrice);
            const gross = qty * price;
            newItems[index].discount = Math.round(gross * (numVal / 100));
        } else {
            (newItems[index] as any)[field] = value;
        }

        // Auto-fill UOM and Price if product selected via SKU typing (Case-Insensitive)
        if (field === "sku") {
            const valStr = String(value).trim().toLowerCase();
            const product = Array.isArray(products) ? products.find(p =>
                (p.sku && p.sku.toLowerCase() === valStr) ||
                (p.barcode && p.barcode.toLowerCase() === valStr) ||
                (p.name && p.name.toLowerCase() === valStr)
            ) : null;
            
            if (product) {
                newItems[index].productId = product.id;
                newItems[index].sku = product.sku;
                newItems[index].uom = product.uom || "";
                if (parseIndoNumber(newItems[index].salesPrice) === 0) {
                    newItems[index].salesPrice = Number(product.price || 0);
                }
                // Pre-select first vendor with stock if available
                if (product.stocks && product.stocks.length > 0) {
                    newItems[index].vendorName = product.stocks[0].vendorName;
                } else {
                    newItems[index].vendorName = "UMUM";
                }
            } else {
                newItems[index].productId = "";
                newItems[index].vendorName = "UMUM";
            }
        }

        setItems(newItems);
    };

    const handleOrderSelect = (orderId: string) => {
        setSelectedOrderId(orderId);
        const order = orders.find(o => o.id === orderId);
        if (order) {
            setBuyerName(order.buyerName);
            setRecipient(order.recipient);
            setWarehouseId(order.warehouseId);
            setSalesPerson(order.salesPerson);
            setIsPKP(Number(order.taxRate) > 0);
            
            // Map order items to delivery items
            const newItems = order.items.map((i: any) => ({
                productId: i.productId,
                sku: i.product?.sku || "",
                quantity: Number(i.quantity) - Number(i.shippedQuantity || 0), // Remaining to ship
                salesPrice: Number(i.salesPrice),
                discount: Number(i.discount),
                discountPercent: "",
                uom: i.uom || i.product?.uom || "",
                vendorName: "UMUM",
                orderItemId: i.id
            }));
            setItems(newItems.filter((i: any) => i.quantity > 0));
        }
    };

    const totalQty = useMemo(() => {
        return items.reduce((acc, item) => acc + parseIndoNumber(item.quantity), 0);
    }, [items]);

    // Totals Calculation
    const grossAmount = items.reduce((sum, item) => {
        const q = parseIndoNumber(item.quantity);
        const p = parseIndoNumber(item.salesPrice);
        return sum + (q * p);
    }, 0);

    const itemDiscounts = items.reduce((sum, item) => {
        return sum + parseIndoNumber(item.discount);
    }, 0);

    const subtotal = grossAmount - itemDiscounts;

    const finalDiscountNominal = useMemo(() => {
        if (totalDiscountPercent !== "" && Number(totalDiscountPercent) > 0) {
            return Math.round(subtotal * (Number(totalDiscountPercent) / 100));
        }
        return parseIndoNumber(totalDiscount);
    }, [subtotal, totalDiscountPercent, totalDiscount]);

    const dpp = subtotal - finalDiscountNominal;
    const dppNilaiLain = isPKP ? Math.round(dpp * 0.916666666666667) : 0;
    const taxAmount = isPKP ? Math.round(dppNilaiLain * 0.12) : 0;
    const grandTotal = Math.round(dpp + taxAmount);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const hasEmptyItems = items.some(i => !i.productId || !i.quantity);
        if (!recipient || !buyerName || hasEmptyItems) {
            setError("Mohon lengkapi semua data dan isi qty.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const data = {
                orderId: selectedOrderId,
                recipient,
                buyerName,
                poNumber,
                vehicleNumber,
                warehouseId,
                salesPerson,
                isPKP: isPKP,
                totalDiscount: Number(finalDiscountNominal) || 0,
                taxRate: isPKP ? 11 : 0,
                createdAt: new Date(date),
                items: items.map(i => ({
                    productId: i.productId,
                    quantity: parseIndoNumber(i.quantity),
                    salesPrice: parseIndoNumber(i.salesPrice),
                    discount: parseIndoNumber(i.discount || 0),
                    uom: i.uom,
                    vendorName: i.vendorName
                }))
            };

            let res;
            if (initialData) {
                res = await callAction("updateSalesDelivery", initialData.id, data);
            } else {
                res = await callAction("createSalesDelivery", data);
            }

            if (res && res.error) {
                setError(res.error);
                setLoading(false);
            } else {
                setResult(res);
            }
        } catch (err: any) {
            setError(err.message || "Gagal menyimpan data.");
            setLoading(false);
        }
    };

    if (result) {
        return (
            <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[110] p-4 backdrop-blur-sm">
                <div className="bg-white border-2 border-primary rounded-xl shadow-2xl w-full max-w-md p-8 text-center space-y-4 animate-in fade-in zoom-in duration-300">
                    <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center border-2 border-emerald-500">
                        <FileCheck className="h-8 w-8 text-emerald-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Penjualan Berhasil!</h2>
                    <p className="text-slate-500 font-medium">No. Form Tracking Anda:</p>
                    <div className="p-4 bg-slate-100 border-2 border-slate-200 rounded-lg font-mono text-xl font-bold text-primary">
                        {result.deliveryNumber}
                    </div>
                    <button
                        onClick={onClose}
                        className="w-full bg-primary text-white py-3 rounded-md hover:bg-primary/90 mt-4 font-bold shadow-lg"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-start justify-center p-2 sm:p-4 overflow-y-auto custom-scrollbar animate-in fade-in duration-300">
            <div className="bg-white shadow-2xl rounded-3xl w-full max-w-7xl h-auto max-h-[90vh] min-h-[400px] overflow-hidden flex flex-col border border-slate-200 mt-4 sm:mt-10 mb-4 animate-in zoom-in duration-300">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                    <div className="flex items-center gap-5">
                        <div className="p-3.5 bg-primary text-white rounded-2xl shadow-xl shadow-primary/20">
                            <ShoppingCart className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                                {initialData ? "Update Penjualan" : "Input Penjualan Baru"}
                            </h2>
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3 uppercase">
                        <div className="p-2 bg-primary rounded-xl text-white">
                            <Truck className="h-5 w-5" />
                        </div>
                        {initialData ? "Edit Surat Jalan" : "Input Surat Jalan (SJ)"}
                    </h2>
                    <button onClick={onClose} className="p-3 hover:bg-rose-50 hover:text-rose-500 rounded-2xl transition-all">
                        <X className="h-6 w-6 text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto bg-slate-50/30 custom-scrollbar">
                    {/* Main Content: Headers then Items then Totals */}
                    <div className="p-4 lg:p-6 space-y-6">
                        {/* Reference Selection */}
                        {!initialData && (
                            <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100 flex flex-col md:flex-row items-center gap-6">
                                <div className="bg-white p-3 rounded-2xl shadow-sm border border-indigo-100 shrink-0">
                                    <ShoppingCart className="h-6 w-6 text-indigo-600" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Pilih dari PO Penjualan</p>
                                    <select 
                                        value={selectedOrderId}
                                        onChange={e => handleOrderSelect(e.target.value)}
                                        className="w-full bg-transparent border-none focus:ring-0 text-sm font-black text-slate-900 placeholder:text-slate-400 p-0"
                                    >
                                        <option value="">-- Buat SJ Tanpa PO / Manual --</option>
                                        {orders.filter((o: any) => o.status !== "DRAFT").map((o: any) => (
                                            <option key={o.id} value={o.id}>{o.orderNumber} - {o.buyerName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-200">Recommended</div>
                            </div>
                        )}

                        {/* Compact Logistics Header */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Buyer / Customer</label>
                                    <input
                                        list={isManualBuyer ? undefined : "customer-list-2"}
                                        value={buyerName}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setBuyerName(val);
                                            if (!isManualBuyer) {
                                                const customer = customers.find(c => c.name === val);
                                                if (customer && customer.address) setRecipient(customer.address);
                                            }
                                        }}
                                        className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-bold focus:border-primary outline-none transition-all"
                                        placeholder={isManualBuyer ? "Manual Buyer..." : "Search customer..."}
                                        required
                                    />
                                    {!isManualBuyer && (
                                        <datalist id="customer-list-2">
                                            {Array.isArray(customers) && customers.map(c => <option key={c.id} value={c.name} />)}
                                        </datalist>
                                    )}
                                </div>

                                <div className="space-y-1 min-w-0">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">PO Number / SJ Date</label>
                                    <div className="flex gap-1">
                                        <div className="relative flex-[2] min-w-0">
                                            <input
                                                value={poNumber}
                                                onChange={e => setPoNumber(e.target.value)}
                                                placeholder="PO"
                                                className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-bold focus:border-primary outline-none transition-all placeholder:text-slate-300"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <input
                                                type="date"
                                                value={date}
                                                onChange={e => setDate(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg text-xs font-bold focus:border-primary outline-none cursor-pointer"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">No. Kendaraan</label>
                                    <input
                                        list="vehicle-list"
                                        value={vehicleNumber}
                                        onChange={e => setVehicleNumber(e.target.value)}
                                        placeholder="F 0000 XX"
                                        className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-bold focus:border-primary outline-none transition-all placeholder:text-slate-300"
                                    />
                                    <datalist id="vehicle-list">
                                        <option value="F 8440 GY - Karno" />
                                        <option value="F 8744 GY - Rahmat/imam" />
                                        <option value="F 8065 HI - Rohman/yadi" />
                                        <option value="B 9918 TIT - Heru/Tatang" />
                                    </datalist>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Gudang & Sales</label>
                                    <div className="flex gap-1">
                                        <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg text-xs font-bold focus:border-primary outline-none" required>
                                            {Array.isArray(warehouses) && warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                        </select>
                                        <select value={salesPerson} onChange={e => setSalesPerson(e.target.value)} className="w-full bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg text-xs font-bold focus:border-primary outline-none">
                                            <option value="">(None)</option>
                                            <option value="BC">BC</option>
                                            <option value="PF">PF</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex justify-between">
                                        Ship To / Address
                                        <span 
                                            className="text-primary hover:underline lowercase cursor-pointer"
                                            onClick={() => setIsManualBuyer(!isManualBuyer)}
                                        >
                                            {isManualBuyer ? "auto" : "man"}
                                        </span>
                                    </label>
                                    <input
                                        value={recipient}
                                        onChange={e => setRecipient(e.target.value)}
                                        placeholder="Address..."
                                        className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-medium focus:border-primary outline-none"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Items Section Header */}
                        <div className="flex justify-between items-center px-1">
                            <div className="flex items-center gap-2">
                                <span className="bg-primary text-white h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-black">2</span>
                                <h3 className="font-black text-slate-800 tracking-tight uppercase text-xs">Daftar Barang</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={addItem} className="bg-primary text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-slate-900 transition-all flex items-center gap-1.5">
                                    <Plus className="h-3.5 w-3.5" /> Item Baru
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setShowDiscount(!showDiscount)} 
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border flex items-center gap-1.5",
                                        showDiscount ? "bg-orange-600 border-orange-600 text-white" : "bg-white border-slate-200 text-slate-500 hover:border-orange-400"
                                    )}
                                >
                                    <Tag className="h-3.5 w-3.5" /> Diskon Item
                                </button>
                            </div>
                        </div>

                        {/* FIXED WIDTH HEADER (Pixel-Perfect Alignment) */}
                        <div className="hidden lg:flex items-center gap-4 px-4 py-2.5 bg-slate-100/80 rounded-xl text-[9px] font-black uppercase text-slate-500 tracking-widest border border-slate-200">
                            <div className="flex-[4] min-w-0">Product / SKU</div>
                            <div className="flex-[2] min-w-0">Source / Vendor</div>
                            <div className="w-16 text-center">Qty</div>
                            <div className="flex-[2] text-right pr-4">Price</div>
                            {showDiscount && <div className="w-16 text-right pr-2">Disc</div>}
                            <div className={cn(showDiscount ? "flex-[2]" : "flex-[3]", "text-right pr-4")}>Subtotal</div>
                            <div className="w-10 text-center">Del</div>
                        </div>

                        {/* Item Rows (Fixed Width) */}
                        <div className="space-y-1.5 lg:space-y-0.5">
                            {items.map((item, index) => (
                                <div key={index} className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4 px-3 py-2 lg:p-1.5 bg-white lg:bg-transparent lg:border-b border-slate-100 group relative hover:bg-slate-50/50 transition-colors">
                                    {/* Column: Product */}
                                    <div className="w-full lg:flex-[4] min-w-0">
                                        <label className="lg:hidden text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Product</label>
                                        <div className="relative w-full">
                                            <input
                                                list={`product-list-sales-${index}`}
                                                value={item.sku}
                                                onChange={e => updateItem(index, 'sku', e.target.value)}
                                                className="w-full bg-white border border-slate-200 lg:border-slate-100 px-3 py-1.5 rounded-lg lg:rounded-md text-[13px] font-black outline-none focus:border-primary focus:bg-white focus:shadow-sm transition-all"
                                                placeholder="SKU"
                                                required
                                            />
                                            <datalist id={`product-list-sales-${index}`}>
                                                {Array.isArray(products) && products.map((p: any) => (
                                                    <option key={p.id} value={p.sku}>{p.name} - {p.uom}</option>
                                                ))}
                                            </datalist>
                                        </div>
                                    </div>

                                    {/* Column: Vendor */}
                                    <div className="w-full lg:flex-[2] min-w-0">
                                        <label className="lg:hidden text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Vendor</label>
                                        <select
                                            value={item.vendorName}
                                            onChange={e => updateItem(index, 'vendorName', e.target.value)}
                                            className="w-full lg:bg-white border border-slate-200 lg:border-slate-100 px-2 py-1.5 rounded-lg lg:rounded-md text-[11px] font-bold outline-none focus:border-primary"
                                            required
                                        >
                                            <option value="">Vendor</option>
                                            {item.productId && Array.isArray(products) && products.find(p => p.id === item.productId)?.stocks?.map((s: any) => (
                                                <option key={s.id} value={s.vendorName}>
                                                    {s.vendorName} ({s.quantity})
                                                </option>
                                            ))}
                                            {!item.productId && <option value="UMUM">UMUM</option>}
                                        </select>
                                    </div>

                                    {/* Column: Qty */}
                                    <div className="w-full lg:w-16">
                                        <label className="lg:hidden text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block text-center">Qty</label>
                                        <input
                                            type="text"
                                            value={item.quantity}
                                            onChange={e => updateItem(index, "quantity", e.target.value)}
                                            className="w-full bg-white border border-slate-200 lg:border-slate-100 px-1 py-1.5 rounded-lg lg:rounded-md text-[13px] font-black text-center focus:border-primary"
                                            required
                                        />
                                    </div>

                                    {/* Column: Price */}
                                    <div className="w-full lg:flex-[2]">
                                        <label className="lg:hidden text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block text-right">Price</label>
                                        <input
                                            type="text"
                                            value={item.salesPrice}
                                            onChange={e => updateItem(index, "salesPrice", e.target.value)}
                                            className="w-full bg-white border border-slate-200 lg:border-slate-100 px-3 py-1.5 rounded-lg lg:rounded-md text-[13px] font-black text-right focus:border-primary pr-4"
                                            required
                                        />
                                    </div>

                                    {/* Column: Discount */}
                                    {showDiscount && (
                                        <div className="w-full lg:w-16">
                                            <label className="lg:hidden text-[9px] font-black text-orange-400 uppercase tracking-widest mb-1 block text-right">Disc</label>
                                            <input
                                                type="text"
                                                value={item.discount}
                                                onChange={e => updateItem(index, "discount", e.target.value)}
                                                className="w-full bg-orange-50 border border-orange-200 lg:border-orange-100 px-1 py-1.5 rounded-lg lg:rounded-md text-[12px] font-black text-right text-orange-600 focus:border-orange-400 pr-2"
                                            />
                                        </div>
                                    )}

                                    {/* Column: Subtotal */}
                                    <div className={cn("hidden lg:flex items-center justify-end pr-4", showDiscount ? "lg:flex-[2]" : "lg:flex-[3]")}>
                                        <div className="text-[14px] font-black text-slate-800 text-right">
                                            {((Number(String(item.quantity).replace(/\./g, '').replace(',', '.')) || 0) * (Number(String(item.salesPrice).replace(/\./g, '').replace(',', '.')) || 0) - (Number(String(item.discount || 0).replace(/\./g, '').replace(',', '.')) || 0)).toLocaleString('id-ID')}
                                        </div>
                                    </div>

                                    {/* Column: Delete */}
                                    <div className="w-full lg:w-10 flex justify-center">
                                        <button
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all"
                                            disabled={items.length === 1}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {error && (
                            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-[10px] font-black uppercase flex items-center gap-3 animate-fade-up">
                                <div className="h-1.5 w-1.5 bg-rose-500 rounded-full animate-ping"></div>
                                {error}
                            </div>
                        )}

                        {/* Financial Summary & Footer (V.1 Vertical Style) - MATCHING RECEIPT MODAL */}
                        <div className="mt-8 border-t-2 border-slate-200 pt-8">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Left/Center column: Empty or notes in future */}
                                <div className="lg:col-span-2 hidden lg:block">
                                    <div className="bg-white border border-slate-200 rounded-2xl p-6 h-full flex flex-col justify-center items-center text-slate-400">
                                        <ShoppingCart className="h-12 w-12 mb-2 opacity-20" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-center">Data Pesanan Penjualan Siap Diproses</p>
                                    </div>
                                </div>

                                {/* Right column: Totals */}
                                <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2"></div>
                                    <div className="relative z-10 space-y-4">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5 pb-2 font-mono">Financial Summary</h3>
                                        
                                        <div className="flex justify-between items-center px-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Kotor</span>
                                            <span className="text-sm font-bold font-mono">Rp {grossAmount.toLocaleString('id-ID')}</span>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-orange-400 uppercase tracking-widest flex justify-between ml-1">
                                                Diskon Global
                                                <span 
                                                    className="text-[9px] lowercase opacity-50 cursor-pointer"
                                                    onClick={async () => {
                                                        const p = await prompt({
                                                            title: "Diskon Persentase",
                                                            message: "Masukkan nilai persentase diskon untuk paket penjualan ini:",
                                                            defaultValue: String(totalDiscountPercent) || "0",
                                                            showSlider: true
                                                        });
                                                        if(p !== null) setTotalDiscountPercent(p);
                                                    }}
                                                >
                                                    {totalDiscountPercent ? `${totalDiscountPercent}%` : "set freq"}
                                                </span>
                                            </label>
                                            <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-3 focus-within:border-orange-500/50 transition-all font-mono">
                                                <span className="text-slate-500 font-bold mr-2 text-xs">Rp</span>
                                                <input
                                                    type="text"
                                                    value={totalDiscount}
                                                    onChange={e => setTotalDiscount(e.target.value)}
                                                    className="w-full bg-transparent py-2 text-sm font-black text-white outline-none"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest ml-1">Tipe Faktur</label>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => { setIsPKP(true); setTaxRate(11); }}
                                                    className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                                                        isPKP 
                                                            ? 'bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/30' 
                                                            : 'bg-white/5 border-white/10 text-slate-500 hover:border-blue-400/50'
                                                    }`}
                                                >
                                                    PKP
                                                    <span className="block text-[8px] font-bold opacity-70 mt-0.5">KB-TRN • PPN 11%</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setIsPKP(false); setTaxRate(0); }}
                                                    className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                                                        !isPKP 
                                                            ? 'bg-slate-600 border-slate-500 text-white shadow-lg shadow-slate-600/30' 
                                                            : 'bg-white/5 border-white/10 text-slate-500 hover:border-slate-400/50'
                                                    }`}
                                                >
                                                    Non PKP
                                                    <span className="block text-[8px] font-bold opacity-70 mt-0.5">KB-TRD • 0%</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="pt-4 mt-2 border-t border-white/10">
                                            <div className="flex justify-between items-end mb-1">
                                                <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Total Akhir</label>
                                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">{totalQty} Items</span>
                                            </div>
                                            <p className="text-3xl font-black text-emerald-400 tracking-tighter leading-none mb-4 font-mono">Rp {grandTotal.toLocaleString('id-ID')}</p>
                                            
                                            <button
                                                onClick={handleSubmit}
                                                disabled={loading}
                                                className="w-full bg-primary text-white py-4 rounded-2xl font-black shadow-2xl shadow-primary/20 hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 overflow-hidden group"
                                            >
                                                {loading ? (
                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Save className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                                        <span className="text-xs tracking-widest">KONFIRMASI PROSES</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
