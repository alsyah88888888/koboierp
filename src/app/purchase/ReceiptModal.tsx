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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white shadow-2xl rounded-[2rem] w-full max-w-7xl h-auto max-h-[92vh] min-h-[400px] overflow-hidden flex flex-col border border-slate-200/50">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <div className="pr-4">
                        <h2 className="text-lg md:text-2xl font-bold text-slate-900 leading-tight">{initialData ? "Edit Pembelian" : "Input Pembelian"}</h2>
                        <p className="text-[10px] md:text-sm text-slate-500 font-medium mt-0.5">{initialData ? `Mengedit ${initialData.formNumber}` : "Lengkapi detail faktur, sales, dan rincian barang."}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors border border-slate-200 bg-white shrink-0">
                        <X className="h-5 w-5 md:h-6 md:w-6 text-slate-600" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 md:p-6 lg:p-8 overflow-y-auto space-y-6 bg-white custom-scrollbar">
                    {/* Header Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50 p-4 md:p-5 rounded-xl border-2 border-slate-200">
                        <div className="space-y-2">
                            <label htmlFor="vendor-input" className="text-xs font-bold uppercase text-slate-600 cursor-pointer">Terima Dari (Supplier)</label>
                            <input
                                id="vendor-input"
                                name="vendor"
                                list="supplier-list"
                                value={receivedFrom}
                                onChange={e => setReceivedFrom(e.target.value)}
                                className="w-full p-2.5 bg-white border-2 border-slate-300 rounded-lg focus:border-primary outline-none transition-all font-medium"
                                placeholder="Ketik/Pilih Supplier..."
                                required
                            />
                            <datalist id="supplier-list">
                                {Array.isArray(vendors) && vendors.map(v => <option key={v.id} value={v.name} />)}
                            </datalist>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="receipt-num" className="text-xs font-bold uppercase text-slate-600 cursor-pointer">No. Surat Jalan / Terima</label>
                            <input
                                id="receipt-num"
                                name="receiptNumber"
                                value={receiptNumber}
                                onChange={e => setReceiptNumber(e.target.value)}
                                className="w-full p-2.5 bg-white border-2 border-slate-300 rounded-lg focus:border-primary outline-none transition-all font-medium"
                                placeholder={`Otomatis (${(showDiscount || Number(taxRate) > 0) ? "KB-LPBD" : "KB-LPB"}-...)`}
                            />
                            <p className="text-[10px] text-slate-400 italic mt-0.5">
                                Format: <span className="font-bold text-primary">{(showDiscount || Number(taxRate) > 0) ? "KB-LPBD" : "KB-LPB"} ({(showDiscount || Number(taxRate) > 0) ? "Diskon/PPN Aktif" : "Tanpa Diskon/PPN"})</span>
                            </p>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="receipt-date" className="text-xs font-bold uppercase text-slate-600 cursor-pointer">Tanggal Penerimaan</label>
                            <input
                                id="receipt-date"
                                name="date"
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="w-full p-2.5 bg-white border-2 border-slate-300 rounded-lg focus:border-primary outline-none transition-all font-medium"
                                required
                            />
                        </div>

                        <div className="space-y-4 md:col-span-2 bg-white p-4 rounded-xl border-2 border-slate-200">
                            <div className="flex items-center justify-between">
                                <label htmlFor="tax-toggle" className="text-sm font-bold text-slate-700 cursor-pointer">Gunakan Faktur Pajak?</label>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        id="tax-toggle"
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={hasTaxInvoice}
                                        onChange={(e) => {
                                            setHasTaxInvoice(e.target.checked);
                                            if (!e.target.checked) {
                                                setTaxInvoiceNumber("");
                                                setTaxInvoiceDate("");
                                            }
                                        }}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                            </div>

                            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 transition-all duration-300 overflow-hidden ${hasTaxInvoice ? 'h-auto opacity-100 mt-4' : 'h-0 opacity-0 m-0'}`}>
                                <div className="space-y-2">
                                    <label htmlFor="tax-inv-num" className="text-xs font-bold uppercase text-slate-600 cursor-pointer">Nomor Faktur Pajak</label>
                                    <input
                                        id="tax-inv-num"
                                        name="taxInvoiceNumber"
                                        value={taxInvoiceNumber}
                                        onChange={e => setTaxInvoiceNumber(e.target.value)}
                                        className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 rounded-lg focus:border-primary outline-none transition-all font-medium"
                                        placeholder="000.000-00.00000000"
                                        disabled={!hasTaxInvoice}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="tax-inv-date" className="text-xs font-bold uppercase text-slate-600 cursor-pointer">Tgl Faktur Pajak</label>
                                    <input
                                        id="tax-inv-date"
                                        name="taxInvoiceDate"
                                        type="date"
                                        value={taxInvoiceDate}
                                        onChange={e => setTaxInvoiceDate(e.target.value)}
                                        className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 rounded-lg focus:border-primary outline-none transition-all font-medium"
                                        disabled={!hasTaxInvoice}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="sales-pic" className="text-xs font-bold uppercase text-slate-600 cursor-pointer">Sales / PIC</label>
                            <select
                                id="sales-pic"
                                name="salesPerson"
                                value={salesPerson}
                                onChange={e => setSalesPerson(e.target.value)}
                                className="w-full p-2.5 bg-white border-2 border-slate-300 rounded-lg focus:border-primary outline-none transition-all font-medium"
                            >
                                <option value="">Pilih Sales...</option>
                                <option value="BC">BC (Business Consultant)</option>
                                <option value="PF">PF (Project Finance)</option>
                            </select>
                        </div>

                        <div className="space-y-2 md:col-span-3 border-t pt-4">
                            <label htmlFor="target-warehouse" className="text-xs font-bold uppercase text-slate-600 cursor-pointer">Gudang Tujuan</label>
                            <select
                                id="target-warehouse"
                                name="warehouseId"
                                value={warehouseId}
                                onChange={e => setWarehouseId(e.target.value)}
                                className="w-full p-2.5 bg-white border-2 border-slate-300 rounded-lg focus:border-primary outline-none transition-all font-medium"
                                required
                            >
                                <option value="">Pilih Gudang Utama...</option>
                                {Array.isArray(warehouses) && warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Body Section (Items) */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b-2 border-slate-100 pb-2">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Tag className="h-5 w-5 text-primary" /> Detail Barang & Harga {initialData && "(Edit)"}
                            </h3>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className={`w-10 h-5 rounded-full relative transition-colors ${showDiscount ? "bg-orange-500" : "bg-slate-300"}`}>
                                        <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={showDiscount}
                                            onChange={e => setShowDiscount(e.target.checked)}
                                        />
                                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${showDiscount ? "left-6" : "left-1"}`} />
                                    </div>
                                    <span className="text-xs font-bold text-slate-600 group-hover:text-primary transition-colors">Aktifkan Diskon/Pajak</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 font-bold transition-all border-2 border-emerald-200"
                                >
                                    <Plus className="h-4 w-4" /> Tambah Barang
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {items.map((item, index) => (
                                <div key={index} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-12 gap-4 p-4 bg-slate-50 rounded-xl border-2 border-slate-200 relative group hover:border-primary/30 transition-all items-end">
                                    <div className="sm:col-span-2 lg:col-span-1 xl:col-span-3 space-y-1 text-left">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">SKU / Nama Barang</label>
                                        <div className="relative">
                                            <input
                                                list={`product-list-${index}`}
                                                value={item.sku}
                                                onChange={e => updateItem(index, 'sku', e.target.value)}
                                                className="w-full p-2.5 bg-white border-2 border-slate-300 rounded-lg focus:border-primary outline-none transition-all font-bold pr-10"
                                                placeholder="Ketik SKU..."
                                                required
                                            />
                                            <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                                        </div>
                                        <datalist id={`product-list-${index}`}>
                                            {Array.isArray(products) && products.map(p => <option key={p.id} value={p.sku}>{p.name}</option>)}
                                        </datalist>
                                        <p className="text-[10px] text-slate-400 mt-1 truncate pl-1 font-medium">{item.name || "Belum memilih barang"}</p>
                                    </div>

                                    <div className="xl:col-span-2 space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Quantity</label>
                                        <div className="flex items-center bg-white border-2 border-slate-300 rounded-lg overflow-hidden focus-within:border-primary transition-all">
                                            <input
                                                type="text"
                                                value={item.quantity}
                                                onChange={e => updateItem(index, 'quantity', e.target.value)}
                                                className="w-full p-2.5 outline-none font-black text-center"
                                                required
                                            />
                                            <span className="bg-slate-100 px-2 py-2.5 text-[10px] font-black text-slate-500 border-l border-slate-200">{item.uom}</span>
                                        </div>
                                    </div>

                                    <div className="xl:col-span-2 space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Harga Beli (DPP)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-3 text-xs font-bold text-slate-400">Rp</span>
                                            <input
                                                type="text"
                                                value={item.purchasePrice}
                                                onChange={e => updateItem(index, 'purchasePrice', e.target.value)}
                                                className="w-full p-2.5 bg-white border-2 border-slate-300 rounded-lg focus:border-primary outline-none transition-all font-black pl-8 text-right"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {showDiscount && (
                                        <div className="xl:col-span-2 space-y-1">
                                            <label className="text-[10px] font-bold text-orange-600 uppercase ml-1">Potongan (Disc)</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-3 text-xs font-bold text-orange-400">Rp</span>
                                                <input
                                                    type="text"
                                                    value={item.discount}
                                                    onChange={e => updateItem(index, 'discount', e.target.value)}
                                                    className="w-full p-2.5 bg-orange-50 border-2 border-orange-200 rounded-lg focus:border-orange-500 outline-none transition-all font-black pl-8 text-right text-orange-600"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className={cn("space-y-1", showDiscount ? "xl:col-span-2" : "xl:col-span-4")}>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Subtotal</label>
                                        <div className="w-full p-2.5 bg-slate-200 border-2 border-slate-300 rounded-lg font-black text-right text-slate-700 h-[46px] flex items-center justify-end">
                                            {formatCurrency((Number(item.quantity) || 0) * (Number(item.purchasePrice) || 0) - (Number(item.discount) || 0)).replace('Rp', '').trim()}
                                        </div>
                                    </div>

                                    {items.length > 1 && (
                                        <div className="xl:col-span-1 flex justify-center pb-1">
                                            <button
                                                type="button"
                                                onClick={() => removeItem(index)}
                                                className="p-3 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                            >
                                                <Trash2 className="h-6 w-6" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer Summary Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 pt-4">
                        <div className="space-y-4">
                            <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-200 space-y-4">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2 flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" /> Biaya Lain / Diskon Final
                                </h4>
                                <div className="flex gap-4">
                                    <div className="w-24">
                                        <label htmlFor="total-disc-pct" className="text-[10px] font-bold text-slate-500 uppercase ml-1 cursor-pointer">Disc %</label>
                                        <input
                                            id="total-disc-pct"
                                            name="totalDiscountPercent"
                                            type="number"
                                            step="0.01"
                                            value={totalDiscountPercent}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setTotalDiscountPercent(val);
                                                setTotalDiscount("");
                                            }}
                                            className="w-full bg-white border-2 border-slate-300 px-3 py-2 rounded-xl text-lg font-black text-primary outline-none focus:border-primary transition-all h-12 shadow-sm"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label htmlFor="total-disc-rp" className="text-[10px] font-bold text-slate-500 uppercase ml-1 cursor-pointer">Diskon (Rp)</label>
                                        <input
                                            id="total-disc-rp"
                                            name="totalDiscount"
                                            type="text"
                                            value={totalDiscount}
                                            onChange={e => {
                                                const val = e.target.value.replace(/[^0-9,.]/g, '');
                                                setTotalDiscount(val);
                                                setTotalDiscountPercent("");
                                            }}
                                            className="w-full bg-white border-2 border-slate-300 px-3 py-2 rounded-xl text-lg font-black text-primary outline-none focus:border-primary transition-all h-12 shadow-sm"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1 col-span-2 md:col-span-1 pl-0 md:pl-2">
                                    <label htmlFor="tax-rate-select" className="text-[10px] font-bold text-slate-500 uppercase ml-1 cursor-pointer">Pajak PPN (%)</label>
                                    <select
                                        id="tax-rate-select"
                                        name="taxRate"
                                        value={taxRate}
                                        onChange={e => setTaxRate(Number(e.target.value))}
                                        className="w-full bg-white border-2 border-slate-300 px-3 py-2 rounded-xl text-lg font-black text-indigo-600 outline-none focus:border-indigo-500 transition-all h-12 shadow-sm"
                                    >
                                        <option value={0}>0% (Tanpa PPN)</option>
                                        <option value={11}>11% (PPN Standar)</option>
                                        <option value={12}>12% (PPN 2025)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col justify-center p-6 md:p-8 bg-slate-900 rounded-2xl md:rounded-[2.5rem] text-white border-2 border-slate-800 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/30 transition-all duration-700" />
                            <div className="space-y-3 pb-4 border-b border-white/10 relative z-10">
                                <div className="flex justify-between items-center text-[10px] md:text-xs font-bold text-slate-400">
                                    <span>TOTAL QTY</span>
                                    <span className="font-mono text-white tracking-widest">{totalQty.toLocaleString('id-ID')}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] md:text-xs font-bold text-slate-400">
                                    <span>SUBTOTAL ITEM (Netto)</span>
                                    <span className="font-mono text-white tracking-widest">{formatCurrency(subtotal)}</span>
                                </div>
                                {showDiscount && (
                                    <>
                                        <div className="flex justify-between items-center text-[10px] md:text-xs font-bold text-primary">
                                            <span>DISKON FINAL</span>
                                            <span className="font-mono font-black italic">- {formatCurrency(finalDiscountNominal)}</span>
                                        </div>
                                    </>
                                )}
                                <div className="flex justify-between items-center text-[10px] md:text-xs font-bold text-indigo-400">
                                    <span>PPN ({taxRate}%)</span>
                                    <span className="font-mono tracking-widest">+ {formatCurrency(taxAmount)}</span>
                                </div>
                            </div>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pt-4 relative z-10 gap-4">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grand Total Akhir</p>
                                    <h4 className="text-3xl md:text-4xl font-black text-emerald-400 tracking-tighter drop-shadow-md">
                                        {formatCurrency(grandTotal)}
                                    </h4>
                                </div>
                                <div className="text-left md:text-right w-full md:w-auto border-t md:border-none pt-2 md:pt-0">
                                    <span className="text-[10px] font-bold text-slate-500 block">Metode: API/Hutang</span>
                                    <span className="text-[10px] md:text-xs font-bold text-primary italic uppercase tracking-tighter bg-primary/10 px-2 py-0.5 rounded mt-1 inline-block border border-primary/20">Checked by System</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 md:pt-8 border-t-2 border-slate-100 flex flex-col md:flex-row justify-end gap-3 md:gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full md:w-auto px-8 py-3 border-2 border-slate-300 rounded-xl hover:bg-slate-50 font-bold transition-all text-slate-600 shadow-sm order-2 md:order-1"
                        >
                            <span className="text-slate-600">Batal</span>
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full md:w-auto px-10 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 flex items-center justify-center gap-2 font-bold shadow-xl shadow-primary/20 active:scale-95 disabled:opacity-50 transition-all border-2 border-primary order-1 md:order-2"
                        >
                            {isSubmitting ? "Memproses..." : <span className="text-white">{initialData ? "Simpan Perubahan" : "Simpan Penerimaan"}</span>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
