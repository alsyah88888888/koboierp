import { useState, useMemo, useEffect } from "react";
import { createGoodsReceiptAction, updateGoodsReceiptAction } from "@/app/actions";
import { Plus, Trash2, X, FileCheck, Calculator, Tag } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ReceiptItem {
    productId: string;
    sku: string;
    quantity: number | "";
    purchasePrice: number | "";
    uom: string;
    barcode: string;
}

export function ReceiptModal({ products, warehouses, vendors, onClose, initialData }: { products: any[], warehouses: any[], vendors: any[], onClose: () => void, initialData?: any }) {
    // Header States
    const [receiptNumber, setReceiptNumber] = useState("");
    const [receivedFrom, setReceivedFrom] = useState("");
    const [warehouseId, setWarehouseId] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    // New Header States
    const [taxInvoiceNumber, setTaxInvoiceNumber] = useState("");
    const [taxInvoiceDate, setTaxInvoiceDate] = useState("");
    const [salesPerson, setSalesPerson] = useState(""); // BC or PF

    // Body States
    const [items, setItems] = useState<ReceiptItem[]>([{ productId: "", sku: "", quantity: 1, purchasePrice: 0, uom: "", barcode: "" }]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<{ formNumber: string } | null>(null);

    useEffect(() => {
        if (initialData) {
            setReceiptNumber(initialData.receiptNumber || "");
            setReceivedFrom(initialData.receivedFrom || "");
            setWarehouseId(initialData.warehouseId || "");
            setDate(new Date(initialData.date || initialData.createdAt).toISOString().split('T')[0]);
            setTaxInvoiceNumber(initialData.taxInvoiceNumber || "");
            setTaxInvoiceDate(initialData.taxInvoiceDate ? new Date(initialData.taxInvoiceDate).toISOString().split('T')[0] : "");
            setSalesPerson(initialData.salesPerson || "");

            if (initialData.items && initialData.items.length > 0) {
                setItems(initialData.items.map((i: any) => ({
                    productId: i.productId,
                    sku: i.product?.sku || "",
                    quantity: i.quantity,
                    purchasePrice: Number(i.purchasePrice),
                    uom: i.uom || i.product?.uom || "",
                    barcode: i.product?.barcode || "-"
                })));
            }
        }
    }, [initialData]);

    const addItem = () => setItems([...items, { productId: "", sku: "", quantity: 1, purchasePrice: 0, uom: "", barcode: "" }]);
    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];

        // Handle number inputs to prevent NaN
        if (field === 'quantity') {
            const val = parseInt(value);
            (newItems[index] as any)[field] = isNaN(val) ? "" : val;
        } else if (field === 'purchasePrice') {
            const val = parseFloat(value);
            (newItems[index] as any)[field] = isNaN(val) ? "" : val;
        } else {
            (newItems[index] as any)[field] = value;
        }

        if (field === 'sku') {
            const product = products.find(p => p.sku === value);
            if (product) {
                newItems[index].productId = product.id;
                newItems[index].uom = product.uom || "";
                newItems[index].barcode = product.barcode || "-";
            } else {
                newItems[index].productId = ""; // Reset ID if not found
            }
        }
        setItems(newItems);
    };

    const grandTotal = useMemo(() => {
        return items.reduce((acc, item) => {
            const q = typeof item.quantity === 'number' ? item.quantity : 0;
            const p = typeof item.purchasePrice === 'number' ? item.purchasePrice : 0;
            return acc + (q * p);
        }, 0);
    }, [items]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        const hasEmptyItems = items.some(i => !i.productId || i.quantity === "" || i.purchasePrice === "");
        if (!receiptNumber || !receivedFrom || !warehouseId || hasEmptyItems) {
            alert("Mohon lengkapi semua data dan pastikan harga/qty terisi.");
            return;
        }

        const txDate = date ? new Date(date) : new Date();
        if (isNaN(txDate.getTime())) {
            alert("Tanggal tidak valid.");
            return;
        }

        setIsSubmitting(true);
        try {
            const data = {
                receiptNumber,
                receivedFrom,
                warehouseId,
                date: txDate,
                taxInvoiceNumber,
                taxInvoiceDate: taxInvoiceDate ? new Date(taxInvoiceDate) : undefined,
                salesPerson,
                items: items.map(i => ({
                    productId: i.productId,
                    quantity: Number(i.quantity),
                    purchasePrice: Number(i.purchasePrice),
                    uom: i.uom
                }))
            };

            if (initialData) {
                await updateGoodsReceiptAction(initialData.id, data);
                onClose();
            } else {
                const res = await createGoodsReceiptAction(data);
                setResult({ formNumber: res.formNumber });
            }
        } catch (error) {
            console.error(error);
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white border-2 border-slate-300 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
                <div className="p-6 border-b-2 border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">{initialData ? "Edit Penerimaan Barang" : "Input Penerimaan Barang"}</h2>
                        <p className="text-sm text-slate-500 font-medium">{initialData ? `Mengedit ${initialData.formNumber}` : "Lengkapi detail faktur, sales, dan rincian barang."}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors border border-slate-200 bg-white">
                        <X className="h-6 w-6 text-slate-600" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-8 bg-white">
                    {/* Header Section */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-xl border-2 border-slate-200">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-600">Terima Dari (Supplier)</label>
                            <input
                                list="supplier-list"
                                value={receivedFrom}
                                onChange={e => setReceivedFrom(e.target.value)}
                                className="w-full p-2.5 bg-white border-2 border-slate-300 rounded-lg focus:border-primary outline-none transition-all font-medium"
                                placeholder="Ketik/Pilih Supplier..."
                                required
                            />
                            <datalist id="supplier-list">
                                {vendors.map(v => <option key={v.id} value={v.name} />)}
                            </datalist>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-600">No. Surat Jalan / Terima</label>
                            <input
                                value={receiptNumber}
                                onChange={e => setReceiptNumber(e.target.value)}
                                className="w-full p-2.5 bg-white border-2 border-slate-300 rounded-lg focus:border-primary outline-none transition-all font-medium"
                                placeholder="Misal: SJ-001"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-600">Tanggal Penerimaan</label>
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="w-full p-2.5 bg-white border-2 border-slate-300 rounded-lg focus:border-primary outline-none transition-all font-medium"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-600">Nomor Faktur Pajak</label>
                            <input
                                value={taxInvoiceNumber}
                                onChange={e => setTaxInvoiceNumber(e.target.value)}
                                className="w-full p-2.5 bg-white border-2 border-slate-300 rounded-lg focus:border-primary outline-none transition-all font-medium"
                                placeholder="000.000-00.00000000"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-600">Tgl Faktur Pajak</label>
                            <input
                                type="date"
                                value={taxInvoiceDate}
                                onChange={e => setTaxInvoiceDate(e.target.value)}
                                className="w-full p-2.5 bg-white border-2 border-slate-300 rounded-lg focus:border-primary outline-none transition-all font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-600">Sales / PIC</label>
                            <select
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
                            <label className="text-xs font-bold uppercase text-slate-600">Gudang Tujuan</label>
                            <select
                                value={warehouseId}
                                onChange={e => setWarehouseId(e.target.value)}
                                className="w-full p-2.5 bg-white border-2 border-slate-300 rounded-lg focus:border-primary outline-none transition-all font-medium"
                                required
                            >
                                <option value="">Pilih Gudang Utama...</option>
                                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Body Section (Items) */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b-2 border-slate-100 pb-2">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Tag className="h-5 w-5 text-primary" /> Detail Barang & Harga {initialData && "(Edit)"}
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
                                <div key={index} className="grid grid-cols-12 gap-3 items-end border-2 border-slate-200 p-4 rounded-xl shadow-sm bg-white">
                                    <div className="col-span-1 flex flex-col items-center justify-center p-2 bg-slate-100 rounded-lg border border-slate-200 h-10 self-center mt-6">
                                        <span className="text-xs font-bold text-slate-600">{index + 1}</span>
                                    </div>
                                    <div className="col-span-3 space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Nama / SKU Barang</label>
                                        <input
                                            list={`product-list-${index}`}
                                            value={item.sku}
                                            onChange={e => updateItem(index, 'sku', e.target.value)}
                                            className="w-full p-2 bg-white border-2 border-slate-300 rounded-lg text-sm font-medium outline-none h-10"
                                            placeholder="Ketik SKU..."
                                            required
                                        />
                                        <datalist id={`product-list-${index}`}>
                                            {products.map(p => <option key={p.id} value={p.sku}>{p.name}</option>)}
                                        </datalist>
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Barcode</label>
                                        <div className="w-full p-2 bg-slate-50 border-2 border-slate-200 rounded-lg text-xs font-mono text-slate-600 h-10 flex items-center overflow-hidden">
                                            {item.barcode || "-"}
                                        </div>
                                    </div>
                                    <div className="col-span-1 space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Qty</label>
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={e => updateItem(index, 'quantity', e.target.value)}
                                            className="w-full p-2 bg-white border-2 border-slate-300 rounded-lg text-sm font-bold outline-none text-center h-10"
                                            min="1"
                                            required
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Harga Beli (@)</label>
                                        <div className="relative h-10">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">Rp</span>
                                            <input
                                                type="number"
                                                value={item.purchasePrice}
                                                onChange={e => updateItem(index, 'purchasePrice', e.target.value)}
                                                className="w-full p-2 pl-7 h-full bg-white border-2 border-slate-300 rounded-lg text-sm font-bold outline-none"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Total Beli</label>
                                        <div className="w-full p-2 bg-primary/5 border-2 border-primary/20 rounded-lg text-sm font-bold text-primary text-right h-10 flex items-center justify-end">
                                            {formatCurrency((typeof item.quantity === 'number' ? item.quantity : 0) * (typeof item.purchasePrice === 'number' ? item.purchasePrice : 0))}
                                        </div>
                                    </div>
                                    <div className="col-span-1 flex justify-end pb-1">
                                        <button
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg border border-red-100 bg-white h-10 w-10 flex items-center justify-center"
                                            disabled={items.length === 1}
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer Summary */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-slate-900 rounded-xl text-white border-2 border-slate-800 shadow-xl">
                        <div className="flex items-center gap-3">
                            <Calculator className="h-8 w-8 text-primary" />
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Grand Total Penerimaan</p>
                                <h4 className="text-3xl font-black text-primary tracking-tight">{formatCurrency(grandTotal)}</h4>
                            </div>
                        </div>
                        <div className="text-right mt-4 md:mt-0">
                            <p className="text-xs font-bold text-slate-400">Total {items.length} Item Barang</p>
                            <p className="text-[10px] text-slate-500">Nilai sebelum PPN (sesuaikan jika perlu)</p>
                        </div>
                    </div>

                    <div className="pt-8 border-t-2 border-slate-100 flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-8 py-3 border-2 border-slate-300 rounded-xl hover:bg-slate-50 font-bold transition-all text-slate-600 shadow-sm"
                        >
                            <span className="text-slate-600">Batal</span>
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-10 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 flex items-center gap-2 font-bold shadow-xl shadow-primary/20 active:scale-95 disabled:opacity-50 transition-all border-2 border-primary"
                        >
                            {isSubmitting ? "Memproses..." : <span className="text-white">{initialData ? "Simpan Perubahan" : "Simpan Penerimaan"}</span>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
