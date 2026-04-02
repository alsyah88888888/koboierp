import { useState, useEffect } from "react";
import { X, Plus, Trash2, Loader2, Save, Tag, ShoppingCart } from "lucide-react";
import { createSalesDeliveryAction, updateSalesDeliveryAction } from "../actions";
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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
                await updateSalesDeliveryAction(initialData.id, data);
            } else {
                await createSalesDeliveryAction(data);
            }
            onClose();
        } catch (err: any) {
            setError(err.message || "Gagal menyimpan data.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-0 md:p-4 opacity-100">
            <div className="bg-slate-50 border border-slate-200 shadow-2xl rounded-none md:rounded-[2rem] w-full max-w-7xl h-full md:max-h-[95vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 md:px-8 md:py-6 border-b border-slate-200 flex justify-between items-center bg-white shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20">
                            <ShoppingCart className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">
                                {initialData ? "Update Penjualan" : "Input Penjualan Baru"}
                            </h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Surat Jalan & Invoice</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-900">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-4 md:p-8 space-y-8 bg-slate-50/30 custom-scrollbar">
                    {/* Step 1: Logistics */}
                    <div className="erp-card bg-white p-6">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50">
                            <div className="flex items-center gap-3">
                                <span className="bg-primary text-white h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-black shadow-md">1</span>
                                <h3 className="font-black text-slate-800 tracking-tight uppercase text-sm">Informasi Pengiriman</h3>
                            </div>
                            <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm">
                                <label htmlFor="manual-buyer-toggle" className="text-[10px] font-black text-slate-500 cursor-pointer uppercase tracking-tighter">Buyer Manual?</label>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        id="manual-buyer-toggle"
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={isManualBuyer}
                                        onChange={(e) => setIsManualBuyer(e.target.checked)}
                                    />
                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                            </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="space-y-1">
                                <label className="erp-label">Buyer / Customer</label>
                                <input
                                    list={isManualBuyer ? undefined : "customer-list-2"}
                                    value={buyerName}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setBuyerName(val);
                                        if (!isManualBuyer) {
                                            const customer = customers.find(c => c.name === val);
                                            if (customer && customer.address) {
                                                setRecipient(customer.address);
                                            }
                                        }
                                    }}
                                    className="erp-input"
                                    placeholder={isManualBuyer ? "Ketik nama buyer (Manual)..." : "Cari nama customer..."}
                                    required
                                />
                                {!isManualBuyer && (
                                    <datalist id="customer-list-2">
                                        {Array.isArray(customers) && customers.map(c => <option key={c.id} value={c.name} />)}
                                    </datalist>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="erp-label">Nomor PO Buyer</label>
                                <input
                                    value={poNumber}
                                    onChange={e => setPoNumber(e.target.value)}
                                    placeholder="Isi manual jika ada..."
                                    className="erp-input"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="erp-label">Sales Person</label>
                                <select 
                                    value={salesPerson} 
                                    onChange={e => setSalesPerson(e.target.value)} 
                                    className="erp-input font-bold"
                                >
                                    <option value="">(None)</option>
                                    <option value="BC">BC (Cici)</option>
                                    <option value="PF">PF (Performance)</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="erp-label">Tanggal Transaksi</label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    className="erp-input font-bold"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="erp-label">Gudang Pengirim</label>
                                <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="erp-input font-bold" required>
                                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="erp-label">Penerima & Alamat Kirim</label>
                                <input
                                    value={recipient}
                                    onChange={e => setRecipient(e.target.value)}
                                    placeholder="Nama, Kota, Alamat Lengkap..."
                                    className="erp-input"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Step 2: Items */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <div className="flex items-center gap-3">
                                <span className="bg-primary text-white h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-black shadow-md">2</span>
                                <h3 className="font-black text-slate-800 tracking-tight uppercase text-sm">Rincian Barang</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={addItem} className="erp-btn-primary !px-4 !py-2 !text-[10px] uppercase tracking-widest">
                                    <Plus className="h-4 w-4" /> Item Baru
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setShowDiscount(!showDiscount)} 
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all border-2",
                                        showDiscount ? "bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-100" : "bg-white border-slate-200 text-slate-400 hover:border-orange-500 hover:text-orange-500"
                                    )}
                                >
                                    <Tag className="h-4 w-4 inline mr-1" /> Diskon
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {items.map((item, index) => (
                                <div key={index} className="erp-card bg-white p-4 flex flex-col xl:flex-row gap-4 items-stretch xl:items-end group relative transition-all hover:border-primary/30">
                                    <div className="flex-1 space-y-1">
                                        <label className="erp-label text-slate-400">SKU / Nama Barang</label>
                                        <input
                                            list={`product-list-2-${index}`}
                                            value={item.sku}
                                            onChange={e => updateItem(index, 'sku', e.target.value)}
                                            className="erp-input"
                                            placeholder="Ketik SKU..."
                                            required
                                        />
                                        <datalist id={`product-list-2-${index}`}>
                                            {Array.isArray(products) && products.map(p => <option key={p.id} value={p.sku}>{p.name}</option>)}
                                        </datalist>
                                    </div>

                                    <div className="flex-1 space-y-1">
                                        <label className="erp-label text-slate-400">Stok (Vendor)</label>
                                        <select
                                            value={item.vendorName}
                                            onChange={e => updateItem(index, 'vendorName', e.target.value)}
                                            className="erp-input bg-slate-50 font-bold"
                                            required
                                        >
                                            <option value="">Pilih Stok...</option>
                                            {item.productId && Array.isArray(products) && products.find(p => p.id === item.productId)?.stocks?.map((s: any) => (
                                                <option key={s.id} value={s.vendorName}>
                                                    {s.vendorName} (Sisa: {s.quantity})
                                                </option>
                                            ))}
                                            {!item.productId && <option value="UMUM">UMUM</option>}
                                        </select>
                                    </div>

                                    <div className="w-full xl:w-20 space-y-1">
                                        <label className="erp-label text-slate-400">Qty</label>
                                        <input
                                            type="text"
                                            value={item.quantity}
                                            onChange={e => updateItem(index, "quantity", e.target.value)}
                                            className="erp-input text-center font-black"
                                            required
                                        />
                                    </div>

                                    <div className="w-full xl:w-32 space-y-1">
                                        <label className="erp-label text-slate-400">Harga</label>
                                        <input
                                            type="text"
                                            value={item.salesPrice}
                                            onChange={e => updateItem(index, "salesPrice", e.target.value)}
                                            className="erp-input text-right font-black"
                                            required
                                        />
                                    </div>

                                    {showDiscount && (
                                        <>
                                            <div className="w-full xl:w-20 space-y-1">
                                                <label className="erp-label text-orange-500">Disc %</label>
                                                <input
                                                    type="text"
                                                    value={item.discountPercent}
                                                    onChange={e => updateItem(index, "discountPercent", e.target.value)}
                                                    className="erp-input bg-orange-50 text-right font-black text-orange-600 border-orange-100"
                                                />
                                            </div>
                                            <div className="w-full xl:w-28 space-y-1">
                                                <label className="erp-label text-orange-500">Disc Rp</label>
                                                <input
                                                    type="text"
                                                    value={item.discount}
                                                    onChange={e => updateItem(index, "discount", e.target.value)}
                                                    className="erp-input bg-orange-50 text-right font-black text-orange-600 border-orange-100"
                                                />
                                            </div>
                                        </>
                                    )}

                                    <div className="w-full xl:w-36 space-y-1">
                                        <label className="erp-label text-slate-400">Total Harga</label>
                                        <div className="erp-input h-11 bg-slate-50 flex items-center justify-end font-black text-slate-900 border-slate-100 shadow-inner">
                                            {((Number(String(item.quantity).replace(/\./g, '').replace(',', '.')) || 0) * (Number(String(item.salesPrice).replace(/\./g, '').replace(',', '.')) || 0) - (Number(String(item.discount || 0).replace(/\./g, '').replace(',', '.')) || 0)).toLocaleString('id-ID')}
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        className="p-2 text-rose-300 hover:text-rose-600 rounded-xl transition-all"
                                        disabled={items.length === 1}
                                    >
                                        <Trash2 className="h-6 w-6" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Financial Footer */}
                    <div className="erp-card bg-slate-900 p-8 text-white shadow-2xl relative overflow-hidden mt-6">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-end">
                            <div className="space-y-1">
                                <label className="erp-label !text-slate-500">Total Kotor</label>
                                <p className="text-xl font-black">Rp {grossAmount.toLocaleString('id-ID')}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="erp-label !text-orange-400">Diskon Global (Rp)</label>
                                <input
                                    type="text"
                                    value={totalDiscount}
                                    onChange={e => setTotalDiscount(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-lg font-black text-white outline-none focus:border-orange-500 transition-all"
                                    placeholder="Rp 0"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="erp-label !text-blue-400">PPN (%)</label>
                                <input
                                    type="number"
                                    value={taxRate}
                                    onChange={e => setTaxRate(Number(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-lg font-black text-white outline-none focus:border-blue-500 transition-all"
                                />
                            </div>
                            <div className="text-right">
                                <label className="erp-label !text-emerald-400">Grand Total Akhir</label>
                                <p className="text-4xl font-black text-emerald-400">Rp {grandTotal.toLocaleString('id-ID')}</p>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-rose-50 border-2 border-rose-100 rounded-2xl text-rose-700 text-sm font-bold flex items-center gap-3 mt-4">
                            <div className="h-2 w-2 bg-rose-600 rounded-full animate-pulse"></div>
                            {error}
                        </div>
                    )}
                </form>

                {/* Submit Logic */}
                <div className="p-6 md:px-8 border-t border-slate-200 flex justify-end gap-3 bg-white shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-all"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="erp-btn-primary min-w-[200px]"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span>Memproses...</span>
                            </>
                        ) : (
                            <>
                                <Save className="h-5 w-5" />
                                <span>{initialData ? "Simpan Perbaikan" : "Proses Penjualan"}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
