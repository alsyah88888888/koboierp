"use client";
import { useState, useEffect } from "react";
import { X, Plus, Trash2, Loader2, Save, Tag, ShoppingCart } from "lucide-react";
import { callAction } from "@/proxy";

import { formatCurrency, cn } from "@/lib/utils";
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

export default function SalesModal({ products, warehouses, customers, onClose, initialData }: { products: any[], warehouses: any[], customers: any[], onClose: () => void, initialData?: any }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Header
    const [recipient, setRecipient] = useState("");
    const [buyerName, setBuyerName] = useState("");
    const [warehouseId, setWarehouseId] = useState(Array.isArray(warehouses) && warehouses.length > 0 ? warehouses[0]?.id : "");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [salesPerson, setSalesPerson] = useState("");
    const [poNumber, setPoNumber] = useState("");
    const [isManualBuyer, setIsManualBuyer] = useState(false);

    // Body (Items)
    const [items, setItems] = useState<SalesItem[]>([{ productId: "", sku: "", quantity: 1, salesPrice: 0, discount: 0, discountPercent: "", uom: "", vendorName: "UMUM" }]);

    // Financials
    const [showDiscount, setShowDiscount] = useState(false);
    const [totalDiscount, setTotalDiscount] = useState<number | string>(0);
    const [totalDiscountPercent, setTotalDiscountPercent] = useState<number | string>("");
    const [taxRate, setTaxRate] = useState<number | "">(0); // 0 or 0.11

    useEffect(() => {
        if (initialData) {
            setRecipient(initialData.recipient || "");
            setBuyerName(initialData.buyerName || "");
            setWarehouseId(initialData.warehouseId || "");
            setSalesPerson(initialData.salesPerson || "");
            setDate(new Date(initialData.createdAt).toISOString().split('T')[0]);
            setPoNumber(initialData.poNumber || "");
            setTotalDiscount(Number(initialData.totalDiscount || 0));
            setTaxRate(Number(initialData.taxRate || 0));

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

        // Handle number inputs to support decimals (comma or dot)
        if (field === 'quantity' || field === 'salesPrice') {
            const userDisplayValue = String(value).replace(/[^0-9,.]/g, '');
            (newItems[index] as any)[field] = userDisplayValue;

            // Sync discount if percent exists
            if (newItems[index].discountPercent !== "" && newItems[index].discountPercent !== undefined) {
                const qty = Number(String(newItems[index].quantity).replace(/\./g, '').replace(',', '.')) || 0;
                const price = Number(String(newItems[index].salesPrice).replace(/\./g, '').replace(',', '.')) || 0;
                const gross = qty * price;
                newItems[index].discount = Math.round(gross * (Number(newItems[index].discountPercent) / 100));
            }
        } else if (field === 'discountPercent') {
            newItems[index].discountPercent = value;
            const numVal = Number(value) || 0;
            const qty = Number(String(newItems[index].quantity).replace(/\./g, '').replace(',', '.')) || 0;
            const price = Number(String(newItems[index].salesPrice).replace(/\./g, '').replace(',', '.')) || 0;
            const gross = qty * price;
            newItems[index].discount = Math.round(gross * (numVal / 100));
        } else if (field === 'discount') {
            const userDisplayValue = String(value).replace(/[^0-9,.]/g, '');
            newItems[index].discount = userDisplayValue;
            newItems[index].discountPercent = ""; // Clear percent when manual nominal entered
        } else {
            (newItems[index] as any)[field] = value;
        }

        // Auto-fill UOM and Vendor if product selected via SKU typing
        if (field === "sku") {
            const valStr = String(value).trim().toLowerCase();
            const product = Array.isArray(products) ? products.find(p =>
                (p.sku && p.sku.toLowerCase() === valStr) ||
                (p.barcode && p.barcode.toLowerCase() === valStr)
            ) : null;
            if (product) {
                newItems[index].productId = product.id;
                newItems[index].sku = product.sku;
                newItems[index].uom = product.uom || "";
                if (newItems[index].salesPrice === 0 || newItems[index].salesPrice === "") {
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

    const totalQty = useMemo(() => {
        return items.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
    }, [items]);

    // Totals Calculation
    const grossAmount = items.reduce((sum, item) => {
        const q = Number(String(item.quantity).replace(/\./g, '').replace(',', '.')) || 0;
        const p = Number(String(item.salesPrice).replace(/\./g, '').replace(',', '.')) || 0;
        return sum + (q * p);
    }, 0);

    const itemDiscounts = items.reduce((sum, item) => {
        return sum + (Number(String(item.discount).replace(/\./g, '').replace(',', '.')) || 0);
    }, 0);

    const subtotal = grossAmount - itemDiscounts;

    const finalDiscountNominal = useMemo(() => {
        if (totalDiscountPercent !== "" && Number(totalDiscountPercent) > 0) {
            return Math.round(subtotal * (Number(totalDiscountPercent) / 100));
        }
        return Number(String(totalDiscount).replace(/\./g, '').replace(',', '.')) || 0;
    }, [subtotal, totalDiscountPercent, totalDiscount]);

    const taxAmount = (subtotal - finalDiscountNominal) * (Number(taxRate) / 100);
    const grandTotal = Math.round(subtotal - finalDiscountNominal + taxAmount);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const hasEmptyItems = items.some(i => !i.productId || i.quantity === "" || i.salesPrice === "");
        if (!recipient || !buyerName || hasEmptyItems) {
            setError("Mohon lengkapi semua data dan isi qty/harga.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const data = {
                recipient,
                buyerName,
                poNumber,
                warehouseId,
                salesPerson,
                totalDiscount: Number(finalDiscountNominal) || 0,
                taxRate: Number(taxRate) || 0,
                createdAt: new Date(date),
                items: items.map(i => ({
                    productId: i.productId,
                    quantity: Number(String(i.quantity).replace(/\./g, '').replace(',', '.')),
                    salesPrice: Number(String(i.salesPrice).replace(/\./g, '').replace(',', '.')),
                    discount: Number(String(i.discount || 0).replace(/\./g, '').replace(',', '.')),
                    uom: i.uom,
                    vendorName: i.vendorName
                }))
            };

            if (initialData) {
                await callAction("updateSalesDelivery", initialData.id, data);
            } else {
                await callAction("createSalesDelivery", data);
            }
            onClose();
        } catch (err: any) {

            setError(err.message || "Gagal menyimpan data.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-start justify-center p-2 sm:p-4 overflow-y-auto custom-scrollbar">
            <div className="bg-white shadow-2xl rounded-3xl w-full max-w-7xl h-auto max-h-[90vh] min-h-[400px] overflow-hidden flex flex-col border border-slate-200 mt-4 sm:mt-10 mb-4 animate-in fade-in zoom-in duration-300">
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
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Surat Jalan & Invoice</span>
                                <span className="h-1 w-1 bg-slate-300 rounded-full"></span>
                                <span className="text-[10px] text-primary font-black uppercase tracking-widest">Premium ERP v2.0</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-400 hover:text-slate-900 group">
                        <X className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-slate-50/30">
                    {/* Left Side: Inputs & Items */}
                    <div className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar space-y-4">
                        {/* Compact Logistics Header */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                                        className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-sm font-bold focus:border-primary outline-none transition-all"
                                        placeholder={isManualBuyer ? "Manual Buyer..." : "Search customer..."}
                                        required
                                    />
                                    {!isManualBuyer && (
                                        <datalist id="customer-list-2">
                                            {Array.isArray(customers) && customers.map(c => <option key={c.id} value={c.name} />)}
                                        </datalist>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">PO Number / SJ Date</label>
                                    <div className="flex gap-2">
                                        <input
                                            value={poNumber}
                                            onChange={e => setPoNumber(e.target.value)}
                                            placeholder="PO#"
                                            className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-sm font-bold focus:border-primary outline-none"
                                        />
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={e => setDate(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold focus:border-primary outline-none cursor-pointer"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Warehouse & Sales</label>
                                    <div className="flex gap-2">
                                        <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold focus:border-primary outline-none" required>
                                            {Array.isArray(warehouses) && warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                        </select>
                                        <select value={salesPerson} onChange={e => setSalesPerson(e.target.value)} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold focus:border-primary outline-none">
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
                                            {isManualBuyer ? "auto" : "manual"}
                                        </span>
                                    </label>
                                    <input
                                        value={recipient}
                                        onChange={e => setRecipient(e.target.value)}
                                        placeholder="Delivery address..."
                                        className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-sm font-medium focus:border-primary outline-none"
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

                        {/* Sticky Items Header (Desktop Only) */}
                        <div className="hidden lg:grid grid-cols-12 gap-3 px-4 py-2 bg-slate-200/50 rounded-xl text-[10px] font-black uppercase text-slate-500 tracking-widest border border-slate-200">
                            <div className="col-span-3">Product / SKU</div>
                            <div className="col-span-2">Source / Vendor</div>
                            <div className="col-span-1 text-center">Qty</div>
                            <div className="col-span-2 text-right">Price</div>
                            {showDiscount && <div className="col-span-1 text-right">Disc</div>}
                            <div className={cn(showDiscount ? "col-span-2" : "col-span-3", "text-right")}>Subtotal</div>
                            <div className="col-span-1 text-center">Del</div>
                        </div>

                        {/* Item Rows */}
                        <div className="space-y-2 lg:space-y-1">
                            {items.map((item, index) => (
                                <div key={index} className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-3 p-3 lg:p-2 bg-white lg:bg-transparent lg:border-b border-slate-100 rounded-xl lg:rounded-none items-center group relative animate-fade-up">
                                    <div className="col-span-full lg:col-span-3 lg:flex lg:items-center">
                                        <label className="lg:hidden text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Product</label>
                                        <input
                                            list={`product-list-2-${index}`}
                                            value={item.sku}
                                            onChange={e => updateItem(index, 'sku', e.target.value)}
                                            className="w-full lg:bg-white border border-slate-200 lg:border-slate-100 px-3 py-1.5 rounded-lg lg:rounded-md text-[13px] font-bold outline-none focus:border-primary focus:bg-white"
                                            placeholder="SKU / Name..."
                                            required
                                        />
                                        <datalist id={`product-list-2-${index}`}>
                                            {Array.isArray(products) && products.map(p => <option key={p.id} value={p.sku}>{p.name}</option>)}
                                        </datalist>
                                    </div>

                                    <div className="lg:col-span-2">
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

                                    <div className="grid grid-cols-3 lg:contents gap-2">
                                        <div className="lg:col-span-1">
                                            <label className="lg:hidden text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Qty</label>
                                            <input
                                                type="text"
                                                value={item.quantity}
                                                onChange={e => updateItem(index, "quantity", e.target.value)}
                                                className="w-full lg:bg-white border border-slate-200 lg:border-slate-100 px-2 py-1.5 rounded-lg lg:rounded-md text-[13px] font-black text-center"
                                                required
                                            />
                                        </div>

                                        <div className="lg:col-span-2">
                                            <label className="lg:hidden text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block text-right">Price</label>
                                            <input
                                                type="text"
                                                value={item.salesPrice}
                                                onChange={e => updateItem(index, "salesPrice", e.target.value)}
                                                className="w-full lg:bg-white border border-slate-200 lg:border-slate-100 px-2 py-1.5 rounded-lg lg:rounded-md text-[12px] font-black text-right"
                                                required
                                            />
                                        </div>

                                        {showDiscount && (
                                            <div className="lg:col-span-1">
                                                <label className="lg:hidden text-[9px] font-black text-orange-400 uppercase tracking-widest mb-1 block text-right">Disc</label>
                                                <input
                                                    type="text"
                                                    value={item.discount}
                                                    onChange={e => updateItem(index, "discount", e.target.value)}
                                                    className="w-full lg:bg-orange-50 border border-orange-200 lg:border-orange-100 px-2 py-1.5 rounded-lg lg:rounded-md text-[12px] font-black text-right text-orange-600"
                                                />
                                            </div>
                                        )}

                                        <div className={cn("lg:flex lg:items-center lg:justify-end", showDiscount ? "lg:col-span-2" : "lg:col-span-3")}>
                                            <label className="lg:hidden text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block text-right">Subtotal</label>
                                            <div className="w-full lg:w-auto text-[13px] font-black text-slate-800 text-right lg:pr-2">
                                                {((Number(String(item.quantity).replace(/\./g, '').replace(',', '.')) || 0) * (Number(String(item.salesPrice).replace(/\./g, '').replace(',', '.')) || 0) - (Number(String(item.discount || 0).replace(/\./g, '').replace(',', '.')) || 0)).toLocaleString('id-ID')}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <div className="lg:col-span-1 flex justify-center">
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
                    </div>

                    {/* Right Side: Financial Summary (Desktop Sidebar) */}
                    <div className="w-full lg:w-80 p-4 lg:p-6 bg-slate-900 text-white flex flex-col justify-between relative overflow-hidden shrink-0">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
                        
                        <div className="relative z-10 space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5 pb-2">Financial Summary</h3>
                                
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Gross Amount</span>
                                    <span className="text-sm font-bold">Rp {grossAmount.toLocaleString('id-ID')}</span>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-orange-400 uppercase tracking-widest flex justify-between">
                                        Global Disc
                                        <span 
                                            className="text-[9px] lowercase opacity-50 cursor-pointer"
                                            onClick={() => {
                                                const p = prompt("Percentage?");
                                                if(p) setTotalDiscountPercent(p);
                                            }}
                                        >
                                            {totalDiscountPercent ? `${totalDiscountPercent}%` : "set freq"}
                                        </span>
                                    </label>
                                    <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-3 focus-within:border-orange-500/50 transition-all">
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

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Tax Rate (PPN)</label>
                                    <select 
                                        value={taxRate} 
                                        onChange={e => setTaxRate(Number(e.target.value))}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-sm font-black focus:border-blue-500/50 outline-none"
                                    >
                                        <option value={0} className="text-slate-900">Non PPN (0%)</option>
                                        <option value={11} className="text-slate-900">PPN 11%</option>
                                        <option value={12} className="text-slate-900">PPN 12%</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/10">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Grand Total</label>
                                <p className="text-3xl font-black text-emerald-400 tracking-tighter mt-1">Rp {grandTotal.toLocaleString('id-ID')}</p>
                                <div className="flex items-center gap-2 mt-4 text-slate-500 text-[10px] font-bold uppercase">
                                    <ShoppingCart className="h-3 w-3" />
                                    <span>{totalQty} Items in cart</span>
                                </div>
                            </div>
                        </div>

                        <div className="relative z-10 pt-8 mt-auto">
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
                                        <span className="text-sm">KONFIRMASI PROSES</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center bg-white shrink-0 gap-4">
                    <div className="flex items-center gap-6 text-slate-400">
                         <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-widest">Total Qty</span>
                            <span className="text-lg font-black text-slate-700">{totalQty} Pcs</span>
                         </div>
                         <div className="h-8 w-px bg-slate-100"></div>
                         <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-widest">Items</span>
                            <span className="text-lg font-black text-slate-700">{items.length} Line</span>
                         </div>
                    </div>
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-8 py-3 text-sm font-black text-slate-400 hover:text-slate-600 transition-all uppercase tracking-widest"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="erp-btn-primary min-w-[240px] h-14 !text-base shadow-2xl shadow-primary/30"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span>Memproses...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="h-5 w-5" />
                                    <span>{initialData ? "Simpan Perubahan" : "Konfirmasi & Proses"}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
