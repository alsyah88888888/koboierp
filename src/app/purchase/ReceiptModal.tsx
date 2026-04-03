"use client";

import React, { useState, useEffect } from "react";
import { X, Save, Plus, Trash2, Tag, ShoppingCart, Loader2, FileCheck, Check, Search, AlertCircle } from "lucide-react";
import { callAction } from "@/proxy";
import { cn } from "@/lib/utils";

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
};

export function ReceiptModal({ isOpen, onClose, initialData, warehouses, vendors, products }: any) {
    const [receivedFrom, setReceivedFrom] = useState(initialData?.receivedFrom || "");
    const [receiptNumber, setReceiptNumber] = useState(initialData?.receiptNumber || "");
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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState<any>(null);

    // Derived values
    const subtotal = items.reduce((sum, item) => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.purchasePrice) || 0;
        const disc = Number(item.discount) || 0;
        return sum + (qty * price) - disc;
    }, 0);

    const finalDiscountNominal = totalDiscountPercent 
        ? (subtotal * (Number(totalDiscountPercent) / 100)) 
        : (Number(totalDiscount) || 0);

    const taxAmount = (subtotal - finalDiscountNominal) * (Number(taxRate) / 100);
    const grandTotal = subtotal - finalDiscountNominal + taxAmount;
    const totalQty = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

    if (!isOpen && !result) return null;

    const addItem = () => {
        setItems([...items, { productId: "", sku: "", name: "", quantity: "1", purchasePrice: "0", discount: "0", uom: "PCS" }]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const updateItem = (index: number, field: string, value: string) => {
        const newItems = [...items];
        newItems[index][field] = value;

        if (field === 'sku') {
            const product = products.find((p: any) => p.sku === value);
            if (product) {
                newItems[index].productId = product.id;
                newItems[index].name = product.name;
                newItems[index].uom = product.uom || "PCS";
                // Default purchase price if available
                if (!newItems[index].purchasePrice || newItems[index].purchasePrice === "0") {
                    newItems[index].purchasePrice = (product.purchasePrice || 0).toString();
                }
            }
        }
        setItems(newItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError("");

        try {
            const data = {
                receivedFrom,
                receiptNumber,
                date: new Date(date),
                warehouseId,
                salesPerson,
                taxInvoiceNumber: hasTaxInvoice ? taxInvoiceNumber : null,
                taxInvoiceDate: (hasTaxInvoice && taxInvoiceDate) ? new Date(taxInvoiceDate) : null,
                totalDiscount: finalDiscountNominal,
                taxRate: Number(taxRate),
                items: items.map(item => ({
                    productId: item.productId,
                    quantity: Number(item.quantity),
                    purchasePrice: Number(item.purchasePrice),
                    discount: Number(item.discount),
                    uom: item.uom
                }))
            };

            const response = initialData 
                ? await callAction("updateGoodsReceipt", initialData.id, data)
                : await callAction("createGoodsReceipt", data);
            
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
                        {result.formNumber}
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
                                    <div className="flex gap-2">
                                        <input
                                            value={receiptNumber}
                                            onChange={e => setReceiptNumber(e.target.value)}
                                            placeholder="No. SJ (Auto-ID)"
                                            className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-sm font-bold focus:border-primary outline-none"
                                        />
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={e => setDate(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold focus:border-primary outline-none"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Warehouse & PIC</label>
                                    <div className="flex gap-2">
                                        <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold" required>
                                            <option value="">Gudang</option>
                                            {Array.isArray(warehouses) && warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                                        </select>
                                        <select value={salesPerson} onChange={e => setSalesPerson(e.target.value)} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold">
                                            <option value="">Pilih</option>
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
                                    <div className="flex gap-2">
                                        <input
                                            value={taxInvoiceNumber}
                                            onChange={e => setTaxInvoiceNumber(e.target.value)}
                                            placeholder="No. Faktur Pajak"
                                            className={cn("flex-1 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] outline-none", !hasTaxInvoice && "opacity-30 pointer-events-none")}
                                        />
                                        <input
                                            type="date"
                                            value={taxInvoiceDate}
                                            onChange={e => setTaxInvoiceDate(e.target.value)}
                                            className={cn("w-24 bg-slate-50 border border-slate-200 px-2 py-2 rounded-lg text-[10px] outline-none", !hasTaxInvoice && "opacity-30 pointer-events-none")}
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

                        {/* Sticky Items Header (Desktop Only) */}
                        <div className="hidden lg:grid grid-cols-12 gap-3 px-4 py-2 bg-slate-200/50 rounded-xl text-[10px] font-black uppercase text-slate-500 tracking-widest border border-slate-200">
                            <div className="col-span-5">Product SKU / Name</div>
                            <div className="col-span-1 text-center">UOM</div>
                            <div className="col-span-1 text-center">Qty</div>
                            <div className="col-span-2 text-right">Unit Price</div>
                            {showDiscount && <div className="col-span-1 text-right">Disc</div>}
                            <div className={cn(showDiscount ? "col-span-2" : "col-span-3", "text-right")}>Subtotal</div>
                        </div>

                        {/* Item Rows */}
                        <div className="space-y-2 lg:space-y-1">
                            {items.map((item, index) => (
                                <div key={index} className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-3 p-3 lg:p-2 bg-white lg:bg-transparent lg:border-b border-slate-100 rounded-xl lg:rounded-none items-center group relative animate-fade-up">
                                    <div className="col-span-full lg:col-span-5 lg:flex lg:items-center">
                                        <label className="lg:hidden text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Product</label>
                                        <input
                                            list={`product-list-${index}`}
                                            value={item.sku}
                                            onChange={e => updateItem(index, 'sku', e.target.value)}
                                            className="w-full lg:bg-white border border-slate-200 lg:border-slate-100 px-3 py-1.5 rounded-lg lg:rounded-md text-[13px] font-bold outline-none focus:border-primary focus:bg-white"
                                            placeholder="SKU"
                                            required
                                        />
                                        <datalist id={`product-list-${index}`}>
                                            {Array.isArray(products) && products.map(p => <option key={p.id} value={p.sku}>{p.name}</option>)}
                                        </datalist>
                                        <span className="hidden lg:block text-[11px] text-slate-400 ml-2 truncate max-w-[150px] font-medium">{item.name}</span>
                                    </div>

                                    <div className="grid grid-cols-4 lg:contents gap-2">
                                        <div className="lg:col-span-1">
                                            <label className="lg:hidden text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block text-center">UOM</label>
                                            <input
                                                value={item.uom}
                                                onChange={e => updateItem(index, "uom", e.target.value)}
                                                className="w-full lg:bg-transparent lg:border-none px-2 py-1.5 rounded-lg text-[11px] font-bold text-center uppercase"
                                            />
                                        </div>

                                        <div className="lg:col-span-1">
                                            <label className="lg:hidden text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block text-center">Qty</label>
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
                                                value={item.purchasePrice}
                                                onChange={e => updateItem(index, "purchasePrice", e.target.value)}
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
                                                {formatCurrency((Number(item.quantity) || 0) * (Number(item.purchasePrice) || 0) - (Number(item.discount) || 0)).replace('Rp', '').trim()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        className="absolute -top-1 -right-1 lg:static lg:col-span-1 p-2 bg-white lg:bg-transparent border border-rose-100 lg:border-none rounded-full text-rose-300 hover:text-rose-600 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                                        disabled={items.length === 1}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
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
                    <div className="w-full lg:w-80 p-4 lg:p-6 bg-slate-900 text-white flex flex-col justify-between relative overflow-hidden shrink-0 shadow-2xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
                        
                        <div className="relative z-10 space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5 pb-2">Purchase Summary</h3>
                                
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Gross Subtotal</span>
                                    <span className="text-sm font-bold">Rp {subtotal.toLocaleString('id-ID')}</span>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-orange-400 uppercase tracking-widest flex justify-between">
                                        Total Discount
                                        <span className="text-[9px] lowercase opacity-50 cursor-pointer" onClick={() => {
                                            const p = prompt("Percentage %?");
                                            if(p) setTotalDiscountPercent(p);
                                        }}>
                                            {totalDiscountPercent ? `${totalDiscountPercent}%` : "set %"}
                                        </span>
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
                                    <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Pajak PPN (%)</label>
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
                                <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Total Pembayaran</label>
                                <p className="text-3xl font-black text-emerald-400 tracking-tighter mt-1">{formatCurrency(grandTotal)}</p>
                                <div className="flex items-center gap-2 mt-4 text-slate-500 text-[10px] font-bold uppercase">
                                    <Check className="h-3 w-3" />
                                    <span>{totalQty} Items being received</span>
                                </div>
                            </div>
                        </div>

                        <div className="relative z-10 pt-8 mt-auto">
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="w-full bg-primary text-white py-4 rounded-2xl font-black shadow-2xl shadow-primary/20 hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 group"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <>
                                        <Save className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                        <span className="text-sm">SIMPAN TRANSAKSI</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
