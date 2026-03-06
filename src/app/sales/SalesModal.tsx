import { useState, useEffect } from "react";
import { X, Plus, Trash2, Loader2, Save } from "lucide-react";
import { createSalesDeliveryAction, updateSalesDeliveryAction } from "../actions";
import { formatCurrency } from "@/lib/utils";

interface SalesItem {
    productId: string;
    sku: string;
    quantity: number | "";
    salesPrice: number | "";
    discount: number | "";
    uom: string;
    vendorName: string;
}

export default function SalesModal({ products, warehouses, customers, onClose, initialData }: { products: any[], warehouses: any[], customers: any[], onClose: () => void, initialData?: any }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Header
    const [recipient, setRecipient] = useState("");
    const [buyerName, setBuyerName] = useState("");
    const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || "");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [salesPerson, setSalesPerson] = useState("");

    // Body (Items)
    const [items, setItems] = useState<SalesItem[]>([{ productId: "", sku: "", quantity: 1, salesPrice: 0, discount: 0, uom: "", vendorName: "UMUM" }]);

    // Financials
    const [totalDiscount, setTotalDiscount] = useState<number | "">(0);
    const [taxRate, setTaxRate] = useState<number | "">(0); // 0 or 0.11

    useEffect(() => {
        if (initialData) {
            setRecipient(initialData.recipient || "");
            setBuyerName(initialData.buyerName || "");
            setWarehouseId(initialData.warehouseId || "");
            setSalesPerson(initialData.salesPerson || "");
            setDate(new Date(initialData.createdAt).toISOString().split('T')[0]);
            setTotalDiscount(Number(initialData.totalDiscount || 0));
            setTaxRate(Number(initialData.taxRate || 0));

            if (initialData.items && initialData.items.length > 0) {
                setItems(initialData.items.map((i: any) => ({
                    productId: i.productId,
                    sku: i.product?.sku || "",
                    quantity: i.quantity,
                    salesPrice: Number(i.salesPrice),
                    discount: Number(i.discount || 0),
                    uom: i.uom || i.product?.uom || "",
                    vendorName: i.vendorName || "UMUM"
                })));
            }
        }
    }, [initialData]);

    const addItem = () => setItems([...items, { productId: "", sku: "", quantity: 1, salesPrice: 0, discount: 0, uom: "", vendorName: "UMUM" }]);
    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];

        // Handle number inputs to prevent NaN
        if (field === 'quantity') {
            const raw = String(value).replace(/\D/g, "");
            (newItems[index] as any)[field] = raw ? parseInt(raw, 10) : "";
        } else if (field === 'salesPrice') {
            const raw = String(value).replace(/\D/g, "");
            (newItems[index] as any)[field] = raw ? parseInt(raw, 10) : "";
        } else if (field === 'discount') {
            const val = parseFloat(value);
            (newItems[index] as any)[field] = isNaN(val) ? "" : val;
        } else {
            (newItems[index] as any)[field] = value;
        }

        // Auto-fill UOM and Vendor if product selected via SKU typing
        if (field === "sku") {
            const product = products.find(p => p.sku === value);
            if (product) {
                newItems[index].productId = product.id;
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

    // Totals Calculation
    const grossAmount = items.reduce((sum, item) => {
        const q = typeof item.quantity === 'number' ? item.quantity : 0;
        const p = typeof item.salesPrice === 'number' ? item.salesPrice : 0;
        return sum + (q * p);
    }, 0);

    const itemDiscounts = items.reduce((sum, item) => {
        const q = typeof item.quantity === 'number' ? item.quantity : 0;
        const p = typeof item.salesPrice === 'number' ? item.salesPrice : 0;
        const dPercent = typeof item.discount === 'number' ? item.discount : 0;
        const nominalDiscount = (q * p) * (dPercent / 100);
        return sum + nominalDiscount;
    }, 0);

    const subtotal = grossAmount - itemDiscounts;
    const finalDiscountPercent = Number(totalDiscount) || 0;
    const finalDiscountNominal = subtotal * (finalDiscountPercent / 100);
    const taxAmount = (subtotal - finalDiscountNominal) * (Number(taxRate) / 100);
    const grandTotal = subtotal - finalDiscountNominal + taxAmount;

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
                warehouseId,
                salesPerson,
                totalDiscount: Number(totalDiscount) || 0,
                taxRate: Number(taxRate) || 0,
                createdAt: new Date(date),
                items: items.map(i => ({
                    productId: i.productId,
                    quantity: Number(i.quantity),
                    salesPrice: Number(i.salesPrice),
                    discount: Number(i.discount || 0),
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border-2 border-slate-300 shadow-2xl rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b-2 border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">{initialData ? "Edit Penjualan" : "Input Penjualan Baru"}</h2>
                        <p className="text-sm text-slate-500 mt-1 font-medium">{initialData ? `Mengedit ${initialData.deliveryNumber}` : "Isi detail pengiriman dan barang yang akan dikirim."}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors border border-slate-200 bg-white"><X className="h-6 w-6 text-slate-600" /></button>
                </div>

                <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-8 space-y-8 bg-white">
                    {/* Header Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 bg-slate-50 p-6 rounded-xl border-2 border-slate-200 shadow-sm transition-all duration-300">
                        <div className="space-y-2 lg:col-span-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block">Kirim Ke (Recipient Address/Name)</label>
                            <input
                                value={recipient}
                                onChange={e => setRecipient(e.target.value)}
                                className="w-full bg-white border-2 border-slate-300 px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                                placeholder="Alamat / Lokasi Tujuan"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block">Pengiriman ke Buyer</label>
                            <input
                                list="buyer-list"
                                value={buyerName}
                                onChange={e => {
                                    const val = e.target.value;
                                    setBuyerName(val);
                                    const customer = customers.find(c => c.name === val);
                                    if (customer && customer.address) {
                                        setRecipient(customer.address);
                                    }
                                }}
                                className="w-full bg-white border-2 border-slate-300 px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                                placeholder="Ketik/Pilih Buyer"
                                required
                            />
                            <datalist id="buyer-list">
                                {customers.map(c => <option key={c.id} value={c.name} />)}
                            </datalist>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block">Tanggal</label>
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="w-full bg-white border-2 border-slate-300 px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                                required
                            />
                        </div>
                        <div className="space-y-2 lg:col-span-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 block">Sales Person</label>
                            <select
                                value={salesPerson}
                                onChange={e => setSalesPerson(e.target.value)}
                                className="w-full bg-slate-100 border-2 border-slate-300 px-3 py-2.5 rounded-lg focus:border-primary outline-none transition-all font-bold text-primary"
                                required
                            >
                                <option value="">Pilih Sales...</option>
                                <option value="BC">BC (ID: BC)</option>
                                <option value="PF">PF (ID: PF)</option>
                            </select>
                        </div>
                    </div>

                    {/* Body Section (Items) */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-1 border-b-2 border-slate-100 pb-2">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                                <span className="bg-primary text-white h-7 w-7 rounded-full flex items-center justify-center text-xs shadow-md font-black">2</span>
                                Daftar Barang & Diskon
                            </h3>
                            <button
                                type="button"
                                onClick={addItem}
                                className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary/20 flex items-center gap-2 group active:scale-95"
                            >
                                <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform" />
                                <span>Tambah Barang</span>
                            </button>
                        </div>

                        <div className="space-y-4">
                            {items.map((item, index) => (
                                <div key={index} className="flex gap-4 items-end bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-sm hover:border-primary/30 transition-all group relative overflow-hidden">
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 tracking-widest">Nama Barang / SKU</label>
                                        <input
                                            list={`product-list-sale-${index}`}
                                            value={item.sku}
                                            onChange={e => updateItem(index, 'sku', e.target.value)}
                                            className="w-full bg-white border-2 border-slate-200 px-3 py-2 rounded-lg text-sm font-medium outline-none focus:border-primary transition-all h-11"
                                            placeholder="Ketik SKU..."
                                            required
                                        />
                                        <datalist id={`product-list-sale-${index}`}>
                                            {products.map(p => <option key={p.id} value={p.sku}>{p.name}</option>)}
                                        </datalist>
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 tracking-widest">Pilih Stok (Vendor)</label>
                                        <select
                                            value={item.vendorName}
                                            onChange={e => updateItem(index, 'vendorName', e.target.value)}
                                            className="w-full bg-slate-50 border-2 border-slate-200 px-3 py-2 rounded-lg text-sm font-bold outline-none focus:border-primary transition-all h-11"
                                            required
                                        >
                                            <option value="">Pilih Vendor...</option>
                                            {item.productId && products.find(p => p.id === item.productId)?.stocks?.map((s: any) => (
                                                <option key={s.id} value={s.vendorName}>
                                                    {s.vendorName} (Sisa: {s.quantity})
                                                </option>
                                            ))}
                                            {!item.productId && <option value="UMUM">UMUM</option>}
                                        </select>
                                    </div>
                                    <div className="w-20 space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 tracking-widest">Qty</label>
                                        <input
                                            type="text"
                                            value={item.quantity ? item.quantity.toLocaleString('id-ID') : ""}
                                            onChange={e => updateItem(index, "quantity", e.target.value)}
                                            className="w-full bg-white border-2 border-slate-200 px-3 py-2 rounded-lg text-sm font-black outline-none text-center focus:border-primary transition-all h-11"
                                            required
                                        />
                                    </div>
                                    <div className="w-32 space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 tracking-widest">Harga (@)</label>
                                        <input
                                            type="text"
                                            value={item.salesPrice ? item.salesPrice.toLocaleString('id-ID') : ""}
                                            onChange={e => updateItem(index, "salesPrice", e.target.value)}
                                            className="w-full bg-white border-2 border-slate-200 px-3 py-2 rounded-lg text-sm font-black outline-none text-right focus:border-primary transition-all h-11"
                                            required
                                        />
                                    </div>
                                    <div className="w-28 space-y-1">
                                        <label className="text-[10px] font-bold text-orange-500 uppercase ml-1 tracking-widest">Diskon (%)</label>
                                        <div className="relative h-11">
                                            <input
                                                type="text"
                                                value={item.discount}
                                                onChange={e => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    updateItem(index, "discount", val === '' ? '' : Number(val));
                                                }}
                                                className="w-full bg-orange-50 border-2 border-orange-200 pl-3 pr-7 py-2 rounded-lg text-sm font-black outline-none text-right text-orange-600 focus:border-orange-500 transition-all h-full"
                                                placeholder="0"
                                            />
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-orange-400">%</span>
                                        </div>
                                    </div>
                                    <div className="w-36 space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 tracking-widest">Total Harga</label>
                                        <div className="w-full bg-slate-50 border-2 border-slate-200 px-3 py-2 rounded-lg text-sm font-black text-right text-slate-700 h-11 flex items-center justify-end shadow-inner">
                                            {((typeof item.quantity === 'number' ? item.quantity : 0) * (typeof item.salesPrice === 'number' ? item.salesPrice : 0) * (1 - (Number(item.discount || 0) / 100))).toLocaleString('id-ID')}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl border-2 border-transparent hover:border-red-100 transition-all h-11 w-11 flex items-center justify-center animate-in zoom-in duration-300"
                                        disabled={items.length === 1}
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Financial Footer */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6">
                            <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-200 space-y-4">
                                <h4 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <Save className="h-4 w-4 text-primary" />
                                    Discount & Tax Settings
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 tracking-wider">Diskon Final (%)</label>
                                        <div className="relative h-12">
                                            <input
                                                type="text"
                                                value={totalDiscount}
                                                onChange={e => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    setTotalDiscount(val === '' ? '' : Number(val));
                                                }}
                                                className="w-full bg-white border-2 border-slate-300 pl-3 pr-8 py-2 rounded-xl text-lg font-black text-primary outline-none focus:border-primary transition-all h-full shadow-sm"
                                                placeholder="0"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-primary">%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 tracking-wider">PPN (%)</label>
                                        <div className="relative h-12">
                                            <input
                                                type="text"
                                                value={taxRate}
                                                onChange={e => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    setTaxRate(val === '' ? '' : Number(val));
                                                }}
                                                className="w-full bg-indigo-50 border-2 border-indigo-200 pl-3 pr-8 py-2 rounded-xl text-lg font-black text-indigo-600 outline-none focus:border-indigo-500 transition-all h-full shadow-sm"
                                                placeholder="11"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-indigo-400">%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-primary/5 border-2 border-primary/20 rounded-[2.5rem] p-8 space-y-4 shadow-xl">
                                <div className="space-y-3 pb-4 border-b-2 border-primary/10">
                                    <div className="flex justify-between items-center text-sm font-bold text-slate-500">
                                        <span>SUBTOTAL (Net Items)</span>
                                        <span className="font-black text-slate-700">Rp {subtotal.toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm font-bold text-orange-500">
                                        <span>TOTAL DISKON TAMBAHAN ({totalDiscount === "" ? 0 : totalDiscount}%)</span>
                                        <span className="font-black">- Rp {(subtotal * (Number(totalDiscount) / 100)).toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm font-bold text-indigo-500">
                                        <span>PPN (11%)</span>
                                        <span className="font-black">+ Rp {taxAmount.toLocaleString('id-ID')}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-900 font-black uppercase tracking-[0.2em] text-sm">Grand Total Akhir</span>
                                    <span className="text-4xl font-black text-primary drop-shadow-sm">Rp {grandTotal.toLocaleString('id-ID')}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 border-2 border-red-200 text-red-600 text-sm rounded-2xl flex items-center gap-3 font-black animate-bounce shadow-sm">
                            <span className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                            {error}
                        </div>
                    )}
                </form>

                <div className="p-8 border-t-2 border-slate-100 bg-slate-50 flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-8 py-3.5 border-2 border-slate-300 rounded-[1.25rem] hover:bg-white font-black transition-all text-slate-700 shadow-md hover:shadow-lg active:scale-95"
                    >
                        <span>BATAL</span>
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-12 py-3.5 bg-primary text-white rounded-[1.25rem] hover:bg-primary/90 font-black shadow-2xl shadow-primary/30 flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50 border-2 border-primary"
                    >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                        <span>SIMPAN PENJUALAN</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
