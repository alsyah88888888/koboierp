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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[9999] flex items-center justify-center p-0 md:p-6">
            <div className="bg-white shadow-2xl rounded-none md:rounded-[2.5rem] w-full max-w-7xl h-full md:max-h-[88vh] overflow-hidden flex flex-col border border-slate-200/50 animate-fade-up">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
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

                <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 md:p-10 space-y-10 bg-slate-50/30 custom-scrollbar">
                    {/* Step 1: Logistics */}
                    <div className="erp-card bg-white p-8">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                            <div className="flex items-center gap-4">
                                <span className="bg-primary/5 text-primary h-10 w-10 rounded-2xl flex items-center justify-center text-sm font-black border border-primary/10">01</span>
                                <div>
                                    <h3 className="font-black text-slate-800 tracking-tight uppercase text-sm">Informasi Pengiriman</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Logistics & Customer Details</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 shadow-sm self-stretch sm:self-auto justify-center">
                                <label htmlFor="manual-buyer-toggle" className="text-[11px] font-bold text-slate-500 cursor-pointer uppercase tracking-tight">Buyer Manual?</label>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        id="manual-buyer-toggle"
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={isManualBuyer}
                                        onChange={(e) => setIsManualBuyer(e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <div className="space-y-2">
                                <label className="erp-label">Buyer / Customer</label>
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
                                    className="erp-input px-5 h-12 focus:bg-white"
                                    placeholder={isManualBuyer ? "Nama buyer (Manual)..." : "Cari nama customer..."}
                                    required
                                />
                                {!isManualBuyer && (
                                {Array.isArray(customers) && customers.map(c => <option key={c.id} value={c.name} />)}
                            </datalist>
                        )}
                    </div>


                            <div className="space-y-2">
                                <label className="erp-label">Nomor PO Buyer</label>
                                <input
                                    value={poNumber}
                                    onChange={e => setPoNumber(e.target.value)}
                                    placeholder="Input PO ID jika ada..."
                                    className="erp-input px-5 h-12 focus:bg-white"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="erp-label">Sales Person</label>
                                <select 
                                    value={salesPerson} 
                                    onChange={e => setSalesPerson(e.target.value)} 
                                    className="erp-input px-5 h-12 font-bold cursor-pointer"
                                >
                                    <option value="">(None)</option>
                                    <option value="BC">BC (Cici)</option>
                                    <option value="PF">PF (Performance)</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="erp-label">Tanggal Transaksi</label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    className="erp-input px-5 h-12 font-bold cursor-pointer"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="erp-label">Gudang Pengirim</label>
                                <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="erp-input px-5 h-12 font-bold cursor-pointer" required>
                                    {Array.isArray(warehouses) && warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="erp-label">Penerima & Alamat Kirim</label>
                                <input
                                    value={recipient}
                                    onChange={e => setRecipient(e.target.value)}
                                    placeholder="Alamat lengkap tujuan..."
                                    className="erp-input px-5 h-12 focus:bg-white"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Step 2: Items */}
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-2 gap-4">
                            <div className="flex items-center gap-4">
                                <span className="bg-primary/5 text-primary h-10 w-10 rounded-2xl flex items-center justify-center text-sm font-black border border-primary/10">02</span>
                                <div>
                                    <h3 className="font-black text-slate-800 tracking-tight uppercase text-sm">Daftar Barang</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Product Selection & Inventory</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <button type="button" onClick={addItem} className="erp-btn-primary !px-5 !py-2.5 !text-[11px] uppercase tracking-wider flex-1 sm:flex-none">
                                    <Plus className="h-4 w-4" /> Item Baru
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setShowDiscount(!showDiscount)} 
                                    className={cn(
                                        "px-5 py-2.5 rounded-xl text-[11px] uppercase tracking-wider font-bold transition-all border-2 flex-1 sm:flex-none flex items-center justify-center gap-2",
                                        showDiscount ? "bg-orange-600 border-orange-600 text-white shadow-xl shadow-orange-200" : "bg-white border-slate-200 text-slate-500 hover:border-orange-400 hover:text-orange-500"
                                    )}
                                >
                                    <Tag className="h-4 w-4" /> Diskon
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {items.map((item, index) => (
                                <div key={index} className="erp-card bg-white p-6 flex flex-col xl:flex-row gap-6 items-stretch xl:items-end group relative transition-all animate-fade-up">
                                    <div className="flex-1 space-y-2">
                                        <label className="erp-label !text-slate-400">SKU / Nama Barang</label>
                                        <input
                                            list={`product-list-2-${index}`}
                                            value={item.sku}
                                            onChange={e => updateItem(index, 'sku', e.target.value)}
                                            className="erp-input px-4 h-12 bg-slate-50/50 border-slate-100 hover:border-slate-200 focus:bg-white"
                                            placeholder="Ketik SKU atau scan barcode..."
                                            required
                                        />
                                        <datalist id={`product-list-2-${index}`}>
                                            {Array.isArray(products) && products.map(p => <option key={p.id} value={p.sku}>{p.name}</option>)}
                                        </datalist>
                                    </div>


                                    <div className="flex-1 space-y-2">
                                        <label className="erp-label !text-slate-400">Pilih Stok</label>
                                        <select
                                            value={item.vendorName}
                                            onChange={e => updateItem(index, 'vendorName', e.target.value)}
                                            className="erp-input px-4 h-12 bg-slate-50 border-slate-100 font-bold cursor-pointer"
                                            required
                                        >
                                            <option value="">- Sumber Stok -</option>
                                            {item.productId && Array.isArray(products) && products.find(p => p.id === item.productId)?.stocks && Array.isArray(products.find(p => p.id === item.productId).stocks) && products.find(p => p.id === item.productId).stocks.map((s: any) => (
                                                <option key={s.id} value={s.vendorName}>
                                                    {s.vendorName} ({s.quantity} pcs)
                                                </option>
                                            ))}
                                            {!item.productId && <option value="UMUM">UMUM</option>}
                                        </select>

                                    </div>

                                    <div className="w-full xl:w-24 space-y-2">
                                        <label className="erp-label !text-slate-400">Qty</label>
                                        <input
                                            type="text"
                                            value={item.quantity}
                                            onChange={e => updateItem(index, "quantity", e.target.value)}
                                            className="erp-input text-center font-black h-12"
                                            required
                                        />
                                    </div>

                                    <div className="w-full xl:w-36 space-y-2">
                                        <label className="erp-label !text-slate-400">Harga Satuan</label>
                                        <input
                                            type="text"
                                            value={item.salesPrice}
                                            onChange={e => updateItem(index, "salesPrice", e.target.value)}
                                            className="erp-input text-right font-black h-12"
                                            required
                                        />
                                    </div>

                                    {showDiscount && (
                                        <>
                                            <div className="w-full xl:w-24 space-y-2">
                                                <label className="erp-label !text-orange-500">Disc %</label>
                                                <input
                                                    type="text"
                                                    value={item.discountPercent}
                                                    onChange={e => updateItem(index, "discountPercent", e.target.value)}
                                                    className="erp-input bg-orange-50/30 text-right font-black text-orange-600 border-orange-100 h-12"
                                                />
                                            </div>
                                            <div className="w-full xl:w-32 space-y-2">
                                                <label className="erp-label !text-orange-500">Disc Nominal</label>
                                                <input
                                                    type="text"
                                                    value={item.discount}
                                                    onChange={e => updateItem(index, "discount", e.target.value)}
                                                    className="erp-input bg-orange-50/30 text-right font-black text-orange-600 border-orange-100 h-12"
                                                />
                                            </div>
                                        </>
                                    )}

                                    <div className="w-full xl:w-44 space-y-2">
                                        <label className="erp-label !text-slate-400">Subtotal</label>
                                        <div className="erp-input h-12 bg-slate-900 text-white flex items-center justify-end px-5 font-black border-none shadow-xl shadow-slate-100">
                                            {((Number(String(item.quantity).replace(/\./g, '').replace(',', '.')) || 0) * (Number(String(item.salesPrice).replace(/\./g, '').replace(',', '.')) || 0) - (Number(String(item.discount || 0).replace(/\./g, '').replace(',', '.')) || 0)).toLocaleString('id-ID')}
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all self-center xl:self-end mb-1"
                                        disabled={items.length === 1}
                                    >
                                        <Trash2 className="h-6 w-6" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="erp-card bg-slate-900 p-10 text-white shadow-2xl relative overflow-hidden mt-10">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2"></div>
                        
                        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 items-end">
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Gross Total</label>
                                <p className="text-2xl font-black tracking-tight">Rp {grossAmount.toLocaleString('id-ID')}</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-orange-400">Global Discount</label>
                                <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl px-4 focus-within:border-orange-500/50 transition-all">
                                    <span className="text-slate-500 font-bold mr-2">Rp</span>
                                    <input
                                        type="text"
                                        value={totalDiscount}
                                        onChange={e => setTotalDiscount(e.target.value)}
                                        className="w-full bg-transparent py-3 text-xl font-black text-white outline-none"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-blue-400">Tax Rate (PPN)</label>
                                <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl px-4 focus-within:border-blue-500/50 transition-all">
                                    <input
                                        type="number"
                                        value={taxRate}
                                        onChange={e => setTaxRate(Number(e.target.value))}
                                        className="w-full bg-transparent py-3 text-xl font-black text-white outline-none text-right"
                                    />
                                    <span className="text-slate-500 font-bold ml-2">%</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">Grand Total</label>
                                <p className="text-5xl font-black text-emerald-400 tracking-tighter mt-1">Rp {grandTotal.toLocaleString('id-ID')}</p>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-600 text-sm font-bold flex items-center gap-4 animate-fade-up">
                            <div className="h-2 w-2 bg-rose-500 rounded-full animate-ping"></div>
                            {error}
                        </div>
                    )}
                </form>

                {/* Footer Actions */}
                <div className="px-8 py-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center bg-white shrink-0 gap-4">
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
