import { useState, useEffect } from "react";
import { X, Plus, Trash2, Loader2, Save } from "lucide-react";
import { createSalesDeliveryAction, updateSalesDeliveryAction } from "../actions";

interface SalesItem {
    productId: string;
    sku: string;
    quantity: number | "";
    salesPrice: number | "";
    uom: string;
}

export default function SalesModal({ products, warehouses, onClose, initialData }: { products: any[], warehouses: any[], onClose: () => void, initialData?: any }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Header
    const [recipient, setRecipient] = useState("");
    const [buyerName, setBuyerName] = useState("");
    const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || "");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    // Body (Items)
    const [items, setItems] = useState<SalesItem[]>([{ productId: "", sku: "", quantity: 1, salesPrice: 0, uom: "" }]);

    useEffect(() => {
        if (initialData) {
            setRecipient(initialData.recipient || "");
            setBuyerName(initialData.buyerName || "");
            setWarehouseId(initialData.warehouseId || "");
            setDate(new Date(initialData.createdAt).toISOString().split('T')[0]);

            if (initialData.items && initialData.items.length > 0) {
                setItems(initialData.items.map((i: any) => ({
                    productId: i.productId,
                    sku: i.product?.sku || "",
                    quantity: i.quantity,
                    salesPrice: Number(i.salesPrice),
                    uom: i.uom || i.product?.uom || ""
                })));
            }
        }
    }, [initialData]);

    const addItem = () => setItems([...items, { productId: "", sku: "", quantity: 1, salesPrice: 0, uom: "" }]);
    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];

        // Handle number inputs to prevent NaN
        if (field === 'quantity') {
            const val = parseInt(value);
            (newItems[index] as any)[field] = isNaN(val) ? "" : val;
        } else if (field === 'salesPrice') {
            const val = parseFloat(value);
            (newItems[index] as any)[field] = isNaN(val) ? "" : val;
        } else {
            (newItems[index] as any)[field] = value;
        }

        // Auto-fill UOM if product selected via SKU typing
        if (field === "sku") {
            const product = products.find(p => p.sku === value);
            if (product) {
                newItems[index].productId = product.id;
                newItems[index].uom = product.uom || "";
                if (newItems[index].salesPrice === 0 || newItems[index].salesPrice === "") {
                    newItems[index].salesPrice = Number(product.price || 0);
                }
            } else {
                newItems[index].productId = "";
            }
        }

        setItems(newItems);
    };

    const grandTotal = items.reduce((sum, item) => {
        const q = typeof item.quantity === 'number' ? item.quantity : 0;
        const p = typeof item.salesPrice === 'number' ? item.salesPrice : 0;
        return sum + (q * p);
    }, 0);

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
                items: items.map(i => ({
                    productId: i.productId,
                    quantity: Number(i.quantity),
                    salesPrice: Number(i.salesPrice),
                    uom: i.uom
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
            <div className="bg-white border-2 border-slate-300 shadow-2xl rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b-2 border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">{initialData ? "Edit Penjualan" : "Input Penjualan Baru"}</h2>
                        <p className="text-sm text-slate-500 mt-1 font-medium">{initialData ? `Mengedit ${initialData.deliveryNumber}` : "Isi detail pengiriman dan barang yang akan dikirim."}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors border border-slate-200 bg-white"><X className="h-6 w-6 text-slate-600" /></button>
                </div>

                <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-8 space-y-8 bg-white">
                    {/* Header Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-slate-50 p-6 rounded-xl border-2 border-slate-200 shadow-sm">
                        <div className="space-y-2 lg:col-span-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Kirim Ke (Recipient Address/Name)</label>
                            <input
                                value={recipient}
                                onChange={e => setRecipient(e.target.value)}
                                className="w-full bg-white border-2 border-slate-300 px-3 py-2.5 rounded-lg focus:border-primary outline-none transition-all font-medium"
                                placeholder="Alamat / Lokasi Tujuan"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Pengiriman ke Buyer</label>
                            <input
                                list="buyer-list"
                                value={buyerName}
                                onChange={e => setBuyerName(e.target.value)}
                                className="w-full bg-white border-2 border-slate-300 px-3 py-2.5 rounded-lg focus:border-primary outline-none transition-all font-medium"
                                placeholder="Ketik/Pilih Buyer"
                                required
                            />
                            <datalist id="buyer-list">
                                <option value="CV. Sejahtera Persada" />
                                <option value="PT. Global Niaga" />
                                <option value="Toko Berkah Utama" />
                            </datalist>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Tanggal</label>
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="w-full bg-white border-2 border-slate-300 px-3 py-2.5 rounded-lg focus:border-primary outline-none transition-all font-medium"
                                required
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2 lg:col-span-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Dari Gudang</label>
                            <select
                                value={warehouseId}
                                onChange={e => setWarehouseId(e.target.value)}
                                className="w-full bg-white border-2 border-slate-300 px-3 py-2.5 rounded-lg focus:border-primary outline-none transition-all font-medium"
                            >
                                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Body Section (Items) */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-1 border-b-2 border-slate-100 pb-2">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <span className="bg-primary text-white h-6 w-6 rounded-full flex items-center justify-center text-[10px] shadow-sm">2</span>
                                Daftar Barang {initialData && "(Edit)"}
                            </h3>
                            <button
                                type="button"
                                onClick={addItem}
                                className="bg-primary/10 text-primary px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-primary/20 transition-all border border-primary/20 flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4 text-primary" />
                                <span className="text-primary">Tambah Baris</span>
                            </button>
                        </div>

                        <div className="space-y-4">
                            {items.map((item, index) => (
                                <div key={index} className="flex gap-4 items-end bg-white p-4 rounded-xl border-2 border-slate-200 shadow-sm animate-in slide-in-from-left-2 duration-200">
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Nama Barang / SKU</label>
                                        <input
                                            list={`product-list-sale-${index}`}
                                            value={item.sku}
                                            onChange={e => updateItem(index, 'sku', e.target.value)}
                                            className="w-full bg-white border-2 border-slate-300 px-3 py-2 rounded-lg text-sm font-medium outline-none focus:border-primary transition-all h-10"
                                            placeholder="Ketik SKU..."
                                            required
                                        />
                                        <datalist id={`product-list-sale-${index}`}>
                                            {products.map(p => <option key={p.id} value={p.sku}>{p.name}</option>)}
                                        </datalist>
                                    </div>
                                    <div className="w-24 space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Qty</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={e => updateItem(index, "quantity", e.target.value)}
                                            className="w-full bg-white border-2 border-slate-300 px-3 py-2 rounded-lg text-sm font-bold outline-none text-right focus:border-primary transition-all h-10"
                                            required
                                        />
                                    </div>
                                    <div className="w-32 space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Harga Jual (@)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={item.salesPrice}
                                            onChange={e => updateItem(index, "salesPrice", e.target.value)}
                                            className="w-full bg-white border-2 border-slate-300 px-3 py-2 rounded-lg text-sm font-bold outline-none text-right focus:border-primary transition-all h-10"
                                            required
                                        />
                                    </div>
                                    <div className="w-32 space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Total Jual</label>
                                        <div className="w-full bg-slate-50 border-2 border-slate-200 px-3 py-2 rounded-lg text-sm font-bold text-right text-slate-600 h-10 flex items-center justify-end">
                                            {((typeof item.quantity === 'number' ? item.quantity : 0) * (typeof item.salesPrice === 'number' ? item.salesPrice : 0)).toLocaleString('id-ID')}
                                        </div>
                                    </div>
                                    <div className="w-20 space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Satuan</label>
                                        <input
                                            value={item.uom}
                                            readOnly
                                            className="w-full bg-slate-50 border-2 border-slate-200 px-2 py-2 rounded-lg text-xs font-bold outline-none text-center text-slate-500 h-10"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg border-2 border-red-100 transition-colors h-10 w-10 flex items-center justify-center bg-white"
                                        disabled={items.length === 1}
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Grand Total Display */}
                        <div className="flex justify-end pt-4">
                            <div className="bg-primary/5 border-2 border-primary/20 rounded-xl p-6 min-w-[300px] shadow-sm">
                                <div className="flex justify-between items-center gap-8">
                                    <span className="text-slate-600 font-bold uppercase tracking-wider text-sm">Grand Total Penjualan</span>
                                    <span className="text-2xl font-black text-primary">Rp {grandTotal.toLocaleString('id-ID')}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-destructive/10 border-2 border-destructive/20 text-destructive text-sm rounded-xl flex items-center gap-2 font-bold transition-all">
                            <span className="h-2 w-2 bg-destructive rounded-full" />
                            {error}
                        </div>
                    )}
                </form>

                <div className="p-6 border-t-2 border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-8 py-2.5 border-2 border-slate-300 rounded-xl hover:bg-white font-bold transition-all text-slate-600 shadow-sm"
                    >
                        <span className="text-slate-600">Batal</span>
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-10 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 font-bold shadow-xl shadow-primary/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 border-2 border-primary"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Save className="h-4 w-4 text-white" />}
                        <span className="text-white">{initialData ? "Simpan Perubahan" : "Simpan Penjualan"}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
