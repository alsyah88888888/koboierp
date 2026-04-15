"use client";

import React, { useState, useEffect } from "react";
import { X, Save, Plus, Trash2, Tag, ShoppingCart, Loader2, FileCheck, Check, Search, AlertCircle, Wand2, Activity } from "lucide-react";
import { callAction } from "@/proxy";
import { cn } from "@/lib/utils";
import { useDialog } from "@/components/ui/DialogProvider";

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
};

export function ReceiptModal({ isOpen, onClose, initialData, warehouses, vendors, products }: any) {
    const { prompt } = useDialog();
    const [receivedFrom, setReceivedFrom] = useState(initialData?.receivedFrom || "");
    const [formNumber, setFormNumber] = useState(initialData?.formNumber || "");
    const [date, setDate] = useState(initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    const [warehouseId, setWarehouseId] = useState(initialData?.warehouseId || (Array.isArray(warehouses) && warehouses.length > 0 ? warehouses[0].id : ""));
    const [salesPerson, setSalesPerson] = useState(initialData?.salesPerson || "");
    const [hasTaxInvoice, setHasTaxInvoice] = useState(!!initialData?.taxInvoiceNumber);
    const [taxInvoiceNumber, setTaxInvoiceNumber] = useState(initialData?.taxInvoiceNumber || "");
    const [taxInvoiceDate, setTaxInvoiceDate] = useState(initialData?.taxInvoiceDate ? new Date(initialData.taxInvoiceDate).toISOString().split('T')[0] : "");
    const [items, setItems] = useState<any[]>(initialData?.items?.map((item: any) => ({
        productId: item.productId,
        sku: item.product?.sku || "",
        name: item.product?.name || "",
        quantity: item.quantity.toString(),
        purchasePrice: item.purchasePrice.toString(),
        discount: (item.discount || 0).toString(),
        uom: item.uom || "PCS"
    })) || [{ productId: "", sku: "", name: "", quantity: "1", purchasePrice: "0", discount: "0", uom: "PCS" }]);

    const [totalDiscount, setTotalDiscount] = useState(initialData?.totalDiscount?.toString() || "0");
    const [totalDiscountPercent, setTotalDiscountPercent] = useState("");
    const [taxRate, setTaxRate] = useState(initialData?.taxRate || 0);
    const [showDiscount, setShowDiscount] = useState(items.some(i => Number(i.discount) > 0) || Number(totalDiscount) > 0);
    const [isAutoVerify, setIsAutoVerify] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState<any>(null);

    // Helper to parse numbers intelligently (handle Indonesian dots/commas and decimal points)
    const parseIndoNumber = (val: string | number): number => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        
        let s = String(val).trim();
        
        // If it contains only ONE dot and NO comma, it's likely a decimal point (US style parsing)
        const dotCount = (s.match(/\./g) || []).length;
        const commaCount = (s.match(/,/g) || []).length;
        
        if (dotCount === 1 && commaCount === 0) {
            return parseFloat(s) || 0;
        }
        
        // Otherwise, treat dots as thousand separators and comma as decimal (ID style)
        return Number(s.replace(/\./g, "").replace(",", ".")) || 0;
    };

    // Derived values
    const subtotal = items.reduce((sum, item) => {
        const qty = parseIndoNumber(item.quantity);
        const price = parseIndoNumber(item.purchasePrice);
        const disc = parseIndoNumber(item.discount);
        return sum + (qty * price) - disc;
    }, 0);

    const finalDiscountNominal = totalDiscountPercent 
        ? (subtotal * (parseIndoNumber(totalDiscountPercent) / 100)) 
        : (parseIndoNumber(totalDiscount) || 0);

    const taxAmount = Math.round((subtotal - finalDiscountNominal) * (Number(taxRate) / 100));
    const grandTotal = Math.round(subtotal - finalDiscountNominal + taxAmount);
    const totalQty = items.reduce((sum, item) => sum + (parseIndoNumber(item.quantity) || 0), 0);

    if (!isOpen && !result) return null;

    const addItem = () => {
        setItems([...items, { productId: "", sku: "", name: "", quantity: "1", purchasePrice: "0", discount: "0", uom: "PCS" }]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const generatePoNumber = () => {
        const now = new Date();
        const dateStr = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
        const randomStr = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        setFormNumber(`PO-${dateStr}-${randomStr}`);
    };

    const updateItem = (index: number, field: string, value: string) => {
        const newItems = [...items];
        
        // Handle numeric inputs with formatting preservation
        if (field === 'quantity' || field === 'purchasePrice' || field === 'discount') {
            const userDisplayValue = String(value).replace(/[^0-9,.]/g, '');
            newItems[index][field] = userDisplayValue;
        } else {
            newItems[index][field] = value;
        }

        if (field === 'sku') {
            const lowerValue = value.toLowerCase().trim();
            const product = products.find((p: any) => 
                p.sku?.toLowerCase().trim() === lowerValue ||
                p.name?.toLowerCase().trim() === lowerValue
            );
            
            if (product) {
                newItems[index].productId = product.id;
                newItems[index].sku = product.sku; // Standardize to actual SKU
                newItems[index].name = product.name;
                newItems[index].uom = product.uom || "PCS";
                // Default purchase price if available
                const currentPrice = parseIndoNumber(newItems[index].purchasePrice);
                if (currentPrice === 0) {
                    newItems[index].purchasePrice = (product.purchasePrice || 0).toString();
                }
            } else {
                newItems[index].productId = "";
                newItems[index].name = "";
            }
        }
        setItems(newItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError("");

        try {
            // Validation: Ensure all items have a productId
            const invalidItems = items.filter(item => !item.productId);
            if (invalidItems.length > 0) {
                throw new Error(`Ada ${invalidItems.length} barang yang belum valid/terdaftar. Harap periksa SKU Anda.`);
            }

            const data = {
                receivedFrom,
                formNumber,
                date: new Date(date),
                warehouseId,
                salesPerson,
                hasTaxOrDisc: showDiscount || Number(taxRate) > 0, // Explicit flag for prefixing if tax or disc exists
                taxInvoiceNumber: hasTaxInvoice ? taxInvoiceNumber : null,
                taxInvoiceDate: (hasTaxInvoice && taxInvoiceDate) ? new Date(taxInvoiceDate) : null,
                totalDiscount: finalDiscountNominal,
                taxRate: Number(taxRate),
                items: items.map(item => ({
                    productId: item.productId,
                    quantity: parseIndoNumber(item.quantity),
                    purchasePrice: parseIndoNumber(item.purchasePrice),
                    discount: parseIndoNumber(item.discount),
                    uom: item.uom
                }))
            };

            const response = initialData 
                ? await callAction("updateGoodsReceipt", initialData.id, data)
                : await callAction("createGoodsReceipt", data);
            
            if (response && response.error) {
                setError(response.error);
                return;
            }
            
            setResult(response);
            // Don't close immediately so user can see the form number result
        } catch (err: any) {
            setError(err.message || "Gagal menyimpan data");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (result) {
        return (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-white border-2 border-primary rounded-xl shadow-2xl w-full max-w-md p-8 text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center border-2 border-emerald-500">
                        <FileCheck className="h-8 w-8 text-emerald-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Penerimaan Berhasil!</h2>
                    <p className="text-slate-500 font-medium">No. Form Tracking Anda:</p>
                    <div className="p-4 bg-slate-100 border-2 border-slate-200 rounded-lg font-mono text-xl font-bold text-primary">
                        {result.receiptNumber || result.formNumber}
                    </div>
                    <button
                        onClick={onClose}
                        className="w-full bg-primary text-white py-3 rounded-md hover:bg-primary/90 mt-4 font-bold shadow-lg"
                    >
                        <span className="text-white">Tutup</span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-start justify-center p-2 sm:p-4 overflow-y-auto custom-scrollbar">
            <div className="bg-white shadow-2xl rounded-3xl w-full max-w-7xl h-auto max-h-[90vh] min-h-[400px] overflow-hidden flex flex-col border border-slate-200 mt-4 sm:mt-10 mb-4 animate-in fade-in zoom-in duration-300">
                {/* Unified Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                    <div className="flex items-center gap-5">
                        <div className="p-3.5 bg-primary text-white rounded-2xl shadow-xl shadow-primary/20">
                            <ShoppingCart className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                                {initialData ? "Update Penerimaan" : "Input Penerimaan Barang"}
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Inventory & Goods Receipt</span>
                                <span className="h-1 w-1 bg-slate-300 rounded-full"></span>
                                <span className="text-[10px] text-primary font-black uppercase tracking-widest">PT. Kola Borasi Indonesia ERP V.3</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-400 hover:text-slate-900 group">
                        <X className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>

                {/* Notice for Option A */}
                {!initialData && (
                    <div className="px-6 py-2 bg-slate-900 text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-primary animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest">
                                Status: Auto-Stock Active (Sistem Pilihan A)
                            </span>
                        </div>
                        <span className="text-[9px] font-bold uppercase opacity-80">Stok akan langsung diperbarui saat disimpan</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto bg-slate-50/30 custom-scrollbar">
                    {/* Main Content: Headers then Items then Totals */}
                    <div className="p-4 lg:p-6 space-y-6">
                        {/* Compact Logistics Header */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Terima Dari (Supplier)</label>
                                    <input
                                        list="supplier-list"
                                        value={receivedFrom}
                                        onChange={e => setReceivedFrom(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-sm font-bold focus:border-primary outline-none"
                                        placeholder="Ketik/Pilih Supplier..."
                                        required
                                    />
                                    <datalist id="supplier-list">
                                        {Array.isArray(vendors) && vendors.map((v: any) => <option key={v.id} value={v.name} />)}
                                    </datalist>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">No. SJ / Tgl Terima</label>
                                    <div className="flex gap-1">
                                        <div className="relative flex-1">
                                            <input
                                                value={formNumber}
                                                onChange={e => setFormNumber(e.target.value)}
                                                placeholder="No. SJ"
                                                className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-bold focus:border-primary outline-none transition-all pr-10"
                                            />
                                            <button 
                                                type="button"
                                                onClick={generatePoNumber}
                                                className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 hover:bg-primary/10 rounded-md text-primary transition-all group"
                                                title="Auto PO Number"
                                            >
                                                <Wand2 className="h-4 w-4 group-hover:scale-110" />
                                            </button>
                                        </div>
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={e => setDate(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg text-xs font-bold focus:border-primary outline-none"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Warehouse & PIC</label>
                                    <div className="flex gap-1">
                                        <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg text-xs font-bold outline-none focus:border-primary" required>
                                            <option value="">Gudang</option>
                                            {Array.isArray(warehouses) && warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                                        </select>
                                        <select value={salesPerson} onChange={e => setSalesPerson(e.target.value)} className="w-full bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg text-xs font-bold outline-none focus:border-primary">
                                            <option value="">PIC</option>
                                            <option value="BC">BC</option>
                                            <option value="PF">PF</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex justify-between">
                                        Faktur Pajak
                                        <span className="text-primary hover:underline lowercase cursor-pointer" onClick={() => setHasTaxInvoice(!hasTaxInvoice)}>
                                            {hasTaxInvoice ? "off" : "on"}
                                        </span>
                                    </label>
                                    <div className="flex gap-1">
                                        <input
                                            value={taxInvoiceNumber}
                                            onChange={e => setTaxInvoiceNumber(e.target.value)}
                                            placeholder="No. Faktur"
                                            className={cn("flex-1 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-[11px] font-bold outline-none focus:border-primary", !hasTaxInvoice && "opacity-30 pointer-events-none")}
                                        />
                                        <input
                                            type="date"
                                            value={taxInvoiceDate}
                                            onChange={e => setTaxInvoiceDate(e.target.value)}
                                            className={cn("w-28 bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg text-[10px] font-bold outline-none", !hasTaxInvoice && "opacity-30 pointer-events-none")}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Items Section Header */}
                        <div className="flex justify-between items-center px-1">
                            <div className="flex items-center gap-2">
                                <span className="bg-primary text-white h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-black">2</span>
                                <h3 className="font-black text-slate-800 tracking-tight uppercase text-xs">Daftar Barang Masuk</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={addItem} className="bg-primary text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-slate-900 transition-all flex items-center gap-1.5">
                                    <Plus className="h-3.5 w-3.5" /> Item Baru
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setShowDiscount(!showDiscount)} 
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all flex items-center gap-1.5",
                                        showDiscount ? "bg-orange-600 border-orange-600 text-white" : "bg-white border-slate-200 text-slate-500 hover:border-orange-400"
                                    )}
                                >
                                    <Tag className="h-3.5 w-3.5" /> Item Disc/Tax
                                </button>
                            </div>
                        </div>

                        {/* FIXED WIDTH HEADER (Pixel-Perfect Alignment) */}
                        <div className="hidden lg:flex items-center gap-4 px-4 py-2.5 bg-slate-100/80 rounded-xl text-[9px] font-black uppercase text-slate-500 tracking-widest border border-slate-200">
                            <div className="flex-[4] min-w-0">Product SKU / Name</div>
                            <div className="w-16 text-center">UOM</div>
                            <div className="w-16 text-center">Qty</div>
                            <div className="flex-[3] text-right pr-4">Unit Price</div>
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
                                                list={`product-list-${index}`}
                                                value={item.sku}
                                                onChange={e => updateItem(index, 'sku', e.target.value)}
                                                className="w-full bg-white border border-slate-200 lg:border-slate-100 px-3 py-1.5 rounded-lg lg:rounded-md text-[13px] font-black outline-none focus:border-primary focus:bg-white focus:shadow-sm transition-all"
                                                placeholder="SKU"
                                                required
                                            />
                                            <datalist id={`product-list-${index}`}>
                                                {Array.isArray(products) && products.map((p: any) => (
                                                    <option key={p.id} value={p.sku}>{p.name}</option>
                                                ))}
                                            </datalist>
                                            {item.sku && !item.productId ? (
                                                <span className="text-[9px] text-rose-500 absolute left-3 -bottom-4 font-black uppercase tracking-tighter bg-white px-1 border border-rose-100 rounded z-10 animate-pulse">Barang Tidak Ditemukan</span>
                                            ) : (
                                                <span className="hidden lg:block text-[10px] text-slate-400 absolute left-3 -bottom-4 truncate max-w-[150px] font-bold opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-tighter bg-white px-1 border border-slate-100 rounded z-10">{item.name || "Pilih Barang"}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Column: UOM */}
                                    <div className="w-full lg:w-16">
                                        <label className="lg:hidden text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block text-center">UOM</label>
                                        <input
                                            value={item.uom}
                                            onChange={e => updateItem(index, "uom", e.target.value)}
                                            className="w-full bg-transparent border-none px-1 py-1.5 rounded-lg text-[11px] font-black text-center uppercase text-slate-500"
                                            readOnly
                                        />
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
                                    <div className="w-full lg:flex-[3]">
                                        <label className="lg:hidden text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block text-right">Price</label>
                                        <input
                                            type="text"
                                            value={item.purchasePrice}
                                            onChange={e => updateItem(index, "purchasePrice", e.target.value)}
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
                                            {formatCurrency((Number(item.quantity) || 0) * (Number(item.purchasePrice) || 0) - (Number(item.discount) || 0)).replace('Rp', '').trim()}
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

                        {/* Financial Summary & Footer (V.1 Vertical Style) */}
                        <div className="mt-8 border-t-2 border-slate-200 pt-8">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Left/Center column: Empty or notes in future */}
                                <div className="lg:col-span-2 hidden lg:block">
                                    <div className="bg-white border border-slate-200 rounded-2xl p-6 h-full flex flex-col justify-center items-center text-slate-400">
                                        <ShoppingCart className="h-12 w-12 mb-2 opacity-20" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">Pemeriksaan Barang Masuk Selesai</p>
                                    </div>
                                </div>

                                {/* Right column: Totals */}
                                <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2"></div>
                                    <div className="relative z-10 space-y-4">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5 pb-2">Ringkasan Pembelian</h3>
                                        
                                        <div className="flex justify-between items-center px-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subtotal Kotor</span>
                                            <span className="text-sm font-bold">Rp {subtotal.toLocaleString('id-ID')}</span>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-orange-400 uppercase tracking-widest flex justify-between items-center ml-1">
                                                Diskon Akhir
                                                <button 
                                                    type="button"
                                                    onClick={async () => {
                                                        const p = await prompt({
                                                            title: "Diskon Persentase",
                                                            message: "Masukkan nilai persentase diskon untuk seluruh transaksi ini:",
                                                            defaultValue: totalDiscountPercent || "0",
                                                            showSlider: true
                                                        });
                                                        if(p !== null) setTotalDiscountPercent(p);
                                                    }}
                                                    className="bg-orange-500/10 text-orange-600 hover:bg-orange-500 hover:text-white px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter transition-all border border-orange-500/20"
                                                >
                                                    {totalDiscountPercent ? `${totalDiscountPercent}%` : "Disc %"}
                                                </button>
                                            </label>
                                            <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-3 focus-within:border-orange-500/50 transition-all">
                                                <span className="text-slate-500 font-bold mr-2 text-xs">Rp</span>
                                                <input
                                                    type="text"
                                                    value={totalDiscount}
                                                    onChange={e => {
                                                        setTotalDiscount(e.target.value);
                                                        setTotalDiscountPercent("");
                                                    }}
                                                    className="w-full bg-transparent py-2 text-sm font-black text-white outline-none"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest ml-1">Pajak PPN (%)</label>
                                            <select 
                                                value={taxRate} 
                                                onChange={e => setTaxRate(Number(e.target.value))}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm font-black focus:border-blue-500/50 outline-none"
                                            >
                                                <option value={0} className="text-slate-900">Non PPN (0%)</option>
                                                <option value={11} className="text-slate-900">PPN 11%</option>
                                                <option value={12} className="text-slate-900">PPN 12%</option>
                                            </select>
                                        </div>

                                        <div className="pt-4 mt-2 border-t border-white/10">
                                            <div className="flex justify-between items-end mb-1">
                                                <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Total Akhir</label>
                                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">{totalQty} Items</span>
                                            </div>
                                            <p className="text-3xl font-black text-emerald-400 tracking-tighter leading-none mb-4">{formatCurrency(grandTotal)}</p>
                                            
                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="w-full bg-primary text-white py-4 rounded-2xl font-black shadow-2xl shadow-primary/20 hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 group"
                                            >
                                                {isSubmitting ? (
                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Save className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                                        <span className="text-xs tracking-widest">SIMPAN TRANSAKSI</span>
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
