import { useState, useMemo, useEffect } from "react";
import { createGoodsReceiptAction, updateGoodsReceiptAction } from "@/app/actions";
import { Plus, Trash2, X, FileCheck, Calculator, Tag } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ReceiptItem {
    productId: string;
    sku: string;
    quantity: number | "";
    purchasePrice: number | "";
    discount: number | ""; // Manual Nominal Discount per line
    discountPercent?: number | string; // Percentage discount per line
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
    const [hasTaxInvoice, setHasTaxInvoice] = useState(false);
    const [taxInvoiceNumber, setTaxInvoiceNumber] = useState("");
    const [taxInvoiceDate, setTaxInvoiceDate] = useState("");
    const [salesPerson, setSalesPerson] = useState(""); // BC or PF

    // Body States
    const [items, setItems] = useState<ReceiptItem[]>([{ productId: "", sku: "", quantity: 1, purchasePrice: 0, discount: 0, discountPercent: "", uom: "", barcode: "" }]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<{ formNumber: string } | null>(null);

    // Financials
    const [showDiscount, setShowDiscount] = useState(false);
    const [totalDiscount, setTotalDiscount] = useState<number | "">(0);
    const [totalDiscountPercent, setTotalDiscountPercent] = useState<number | string>("");
    const [taxRate, setTaxRate] = useState<number | "">(0); // 11 means 11%


    useEffect(() => {
        if (initialData) {
            setReceiptNumber(initialData.receiptNumber || "");
            setReceivedFrom(initialData.receivedFrom || "");
            setWarehouseId(initialData.warehouseId || "");
            setDate(new Date(initialData.date || initialData.createdAt).toISOString().split('T')[0]);
            setTaxInvoiceNumber(initialData.taxInvoiceNumber || "");
            setTaxInvoiceDate(initialData.taxInvoiceDate ? new Date(initialData.taxInvoiceDate).toISOString().split('T')[0] : "");
            setHasTaxInvoice(!!initialData.taxInvoiceNumber || !!initialData.taxInvoiceDate);
            setSalesPerson(initialData.salesPerson || "");
            setTotalDiscount(Number(initialData.totalDiscount || 0));
            setTaxRate(Number(initialData.taxRate || 0));
            if (Number(initialData.totalDiscount) > 0 || initialData.items.some((i: any) => Number(i.discount) > 0)) {
                setShowDiscount(true);
            }

            if (initialData.items && initialData.items.length > 0) {
                setItems(initialData.items.map((i: any) => {
                    const qty = Number(i.quantity) || 0;
                    const price = Number(i.purchasePrice) || 0;
                    const discount = Number(i.discount || 0);
                    const gross = qty * price;
                    const discountPercent = gross > 0 && discount > 0 ? Number(((discount / gross) * 100).toFixed(2)) : "";

                    return {
                        productId: i.productId,
                        sku: i.product?.sku || "",
                        quantity: i.quantity,
                        purchasePrice: Number(i.purchasePrice),
                        discount: discount,
                        discountPercent: discountPercent,
                        uom: i.uom || i.product?.uom || "",
                        barcode: i.product?.barcode || "-"
                    };
                }));
            }
        }
    }, [initialData]);

    const addItem = () => setItems([...items, { productId: "", sku: "", quantity: 1, purchasePrice: 0, discount: 0, discountPercent: "", uom: "", barcode: "" }]);
    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];

        // Handle number inputs to prevent NaN
        if (field === 'quantity' || field === 'purchasePrice') {
            const raw = String(value).replace(/\D/g, "");
            (newItems[index] as any)[field] = raw ? parseInt(raw, 10) : "";

            if (newItems[index].discountPercent !== "" && newItems[index].discountPercent !== undefined) {
                const qty = Number(newItems[index].quantity) || 0;
                const price = Number(newItems[index].purchasePrice) || 0;
                const gross = qty * price;
                newItems[index].discount = Math.round(gross * (Number(newItems[index].discountPercent) / 100));
            }
        } else if (field === 'discountPercent') {
            newItems[index].discountPercent = value;
            const numVal = Number(value) || 0;
            const qty = Number(newItems[index].quantity) || 0;
            const price = Number(newItems[index].purchasePrice) || 0;
            const gross = qty * price;
            newItems[index].discount = Math.round(gross * (numVal / 100));
        } else if (field === 'discount') {
            const raw = String(value).replace(/\D/g, "");
            const val = raw ? parseInt(raw, 10) : "";
            newItems[index].discount = val;
            newItems[index].discountPercent = "";
        } else {
            (newItems[index] as any)[field] = value;
        }

        if (field === 'sku') {
            const valStr = String(value).trim().toLowerCase();
            const product = products.find(p =>
                (p.sku && p.sku.toLowerCase() === valStr) ||
                (p.barcode && p.barcode.toLowerCase() === valStr)
            );
            if (product) {
                newItems[index].productId = product.id;
                newItems[index].sku = product.sku;
                newItems[index].uom = product.uom || "";
                newItems[index].barcode = product.barcode || "-";
            } else {
                newItems[index].productId = ""; // Reset ID if not found
            }
        }
        setItems(newItems);
    };

    const totalQty = useMemo(() => {
        return items.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
    }, [items]);

    const grossAmount = useMemo(() => {
        return items.reduce((acc, item) => {
            const q = typeof item.quantity === 'number' ? item.quantity : 0;
            const p = typeof item.purchasePrice === 'number' ? item.purchasePrice : 0;
            return acc + (q * p);
        }, 0);
    }, [items]);

    const subtotal = useMemo(() => {
        return items.reduce((acc, item) => {
            const q = typeof item.quantity === 'number' ? item.quantity : 0;
            const p = typeof item.purchasePrice === 'number' ? item.purchasePrice : 0;
            const d = typeof item.discount === 'number' ? item.discount : 0;
            return acc + ((q * p) - d);
        }, 0);
    }, [items]);

    const finalDiscountNominal = useMemo(() => {
        if (totalDiscountPercent !== "" && Number(totalDiscountPercent) > 0) {
            return Math.round(subtotal * (Number(totalDiscountPercent) / 100));
        }
        return Number(totalDiscount) || 0;
    }, [subtotal, totalDiscountPercent, totalDiscount]);

    const taxAmount = useMemo(() => {
        const amountForTax = subtotal - finalDiscountNominal;
        return amountForTax * (Number(taxRate || 0) / 100);
    }, [subtotal, finalDiscountNominal, taxRate]);

    const grandTotal = useMemo(() => {
        return subtotal - finalDiscountNominal + taxAmount;
    }, [subtotal, finalDiscountNominal, taxAmount]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        const hasEmptyItems = items.some(i => !i.productId || i.quantity === "" || i.purchasePrice === "");
        if (!receivedFrom || !warehouseId || hasEmptyItems) {
            alert("Mohon lengkapi semua data dan pastikan harga/qty terisi.");
            return;
        }

        const txDate = date ? new Date(date + "T00:00:00") : new Date();
        if (isNaN(txDate.getTime())) {
            alert("Tanggal tidak valid.");
            return;
        }

        setIsSubmitting(true);
        try {
            const data = {
                receiptNumber: receiptNumber || undefined, // Backend will auto-generate if missing
                receivedFrom,
                warehouseId,
                date: txDate,
                taxInvoiceNumber: hasTaxInvoice ? taxInvoiceNumber : undefined,
                taxInvoiceDate: hasTaxInvoice && taxInvoiceDate ? new Date(taxInvoiceDate + "T00:00:00") : undefined,
                salesPerson,
                subtotal,
                totalDiscount: finalDiscountNominal,
                taxRate: Number(taxRate) || 0,
                taxAmount,
                grandTotal,
                items: items.map(i => ({
                    productId: i.productId,
                    quantity: Number(i.quantity),
                    purchasePrice: Number(i.purchasePrice),
                    discount: Number(i.discount) || 0,
                    uom: i.uom
                }))
            };

            if (initialData) {
                await updateGoodsReceiptAction(initialData.id, data as any);
                onClose();
            } else {
                const res = await createGoodsReceiptAction(data as any);
                setResult({ formNumber: res.formNumber });
            }
        } catch (error: any) {
            console.error(error);
            alert("Gagal menyimpan: " + (error.message || "Terjadi kesalahan internal."));
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
                        <h2 className="text-2xl font-bold text-slate-900">{initialData ? "Edit Pembelian" : "Input Pembelian"}</h2>
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
                                placeholder="Otomatis (Format: KB-LPB-...)"
                            />
                            <p className="text-[10px] text-slate-400 italic mt-0.5">Kosongkan untuk penomoran otomatis</p>
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

                        <div className="space-y-4 md:col-span-2 bg-white p-4 rounded-xl border-2 border-slate-200">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-slate-700">Gunakan Faktur Pajak?</label>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
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

                            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-300 overflow-hidden ${hasTaxInvoice ? 'h-auto opacity-100 mt-4' : 'h-0 opacity-0 m-0'}`}>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-slate-600">Nomor Faktur Pajak</label>
                                    <input
                                        value={taxInvoiceNumber}
                                        onChange={e => setTaxInvoiceNumber(e.target.value)}
                                        className="w-full p-2.5 bg-slate-50 border-2 border-slate-300 rounded-lg focus:border-primary outline-none transition-all font-medium"
                                        placeholder="000.000-00.00000000"
                                        disabled={!hasTaxInvoice}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-slate-600">Tgl Faktur Pajak</label>
                                    <input
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
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className={`w-10 h-5 rounded-full relative transition-colors ${showDiscount ? "bg-orange-500" : "bg-slate-300"}`}>
                                        <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={showDiscount}
                                            onChange={(e) => setShowDiscount(e.target.checked)}
                                        />
                                        <div className={`absolute top-0.5 h-4 w-4 bg-white rounded-full transition-all ${showDiscount ? "left-5.5" : "left-0.5"}`} style={{ left: showDiscount ? '22px' : '2px' }} />
                                    </div>
                                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider group-hover:text-primary transition-colors">Diskon</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="bg-primary/10 text-primary px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-primary/20 transition-all border border-primary/20 flex items-center gap-2"
                                >
                                    <Plus className="h-4 w-4 text-primary" />
                                    <span className="text-primary">Tambah Baris</span>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {items.map((item, index) => (
                                <div key={index} className="flex gap-3 items-end border-2 border-slate-200 p-4 rounded-xl shadow-sm bg-white hover:border-primary/20 transition-all">
                                    <div className="w-8 flex flex-col items-center justify-center p-2 bg-slate-50 rounded-lg border border-slate-200 h-10 mb-0.5">
                                        <span className="text-[10px] font-black text-slate-400">{index + 1}</span>
                                    </div>
                                    <div className="w-40 space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Barcode</label>
                                        <div className="w-full p-2 bg-slate-50 border-2 border-slate-200 rounded-lg text-sm font-mono text-slate-500 h-10 flex items-center overflow-hidden">
                                            {item.barcode}
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Barang</label>
                                        <input
                                            list={`product-list-${index}`}
                                            value={item.sku}
                                            onChange={e => updateItem(index, 'sku', e.target.value)}
                                            className="w-full p-2 bg-white border-2 border-slate-300 rounded-lg text-sm font-medium outline-none h-10 focus:border-primary transition-all"
                                            placeholder="Cari SKU / Nama..."
                                            required
                                        />
                                        <datalist id={`product-list-${index}`}>
                                            {products.map(p => <option key={p.id} value={p.sku}>{p.name}</option>)}
                                        </datalist>
                                    </div>
                                    <div className="w-20 space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Qty</label>
                                        <input
                                            type="text"
                                            value={item.quantity ? item.quantity.toLocaleString('id-ID') : ""}
                                            onChange={e => updateItem(index, 'quantity', e.target.value)}
                                            className="w-full p-2 bg-white border-2 border-slate-300 rounded-lg text-sm font-black outline-none text-center h-10 focus:border-primary transition-all"
                                            required
                                        />
                                    </div>
                                    <div className="w-32 space-y-1 relative">
                                        <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Harga Beli</label>
                                        <div className="relative h-10 w-full">
                                            <input
                                                type="text"
                                                value={item.purchasePrice ? item.purchasePrice.toLocaleString('id-ID') : ""}
                                                onChange={e => updateItem(index, 'purchasePrice', e.target.value)}
                                                className="w-full p-2 bg-white border-2 border-slate-300 rounded-lg text-sm font-black outline-none text-right h-10 focus:border-primary transition-all pr-2"
                                                required
                                            />
                                        </div>
                                    </div>
                                    {showDiscount && (
                                        <>
                                            <div className="w-24 space-y-1 animate-in slide-in-from-right duration-300">
                                                <label className="text-[10px] uppercase font-bold text-orange-500 ml-1">Diskon (%)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={item.discountPercent}
                                                    onChange={e => updateItem(index, 'discountPercent', e.target.value)}
                                                    className="w-full p-2 bg-orange-50 border-2 border-orange-200 rounded-lg text-sm font-black outline-none text-right text-orange-600 h-10 focus:border-orange-500 transition-all"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div className="w-32 space-y-1 animate-in slide-in-from-right duration-300">
                                                <label className="text-[10px] uppercase font-bold text-orange-500 ml-1">Diskon (Rp)</label>
                                                <input
                                                    type="text"
                                                    value={item.discount ? item.discount.toLocaleString('id-ID') : ""}
                                                    onChange={e => updateItem(index, 'discount', e.target.value)}
                                                    className="w-full p-2 bg-orange-50 border-2 border-orange-200 rounded-lg text-sm font-black outline-none text-right text-orange-600 h-10 focus:border-orange-500 transition-all"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </>
                                    )}
                                    <div className="w-36 space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Net Total</label>
                                        <div className="w-full p-2 bg-slate-50 border-2 border-slate-200 rounded-lg text-sm font-black text-slate-700 text-right h-10 flex items-center justify-end shadow-inner">
                                            {formatCurrency(((Number(item.quantity) || 0) * (Number(item.purchasePrice) || 0)) - (Number(item.discount) || 0))}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg border-2 border-transparent hover:border-red-100 transition-all h-10 w-10 flex items-center justify-center animate-in zoom-in"
                                        disabled={items.length === 1}
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer Summary */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6">
                        <div className={`space-y-4 p-6 rounded-2xl border-2 transition-all duration-500 ${showDiscount ? "bg-slate-50 border-slate-200 opacity-100 h-auto" : "bg-white border-transparent opacity-0 pointer-events-none h-0 p-0 overflow-hidden"}`}>
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <Calculator className="h-4 w-4 text-primary" />
                                Pengaturan Potongan & Pajak
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1 flex gap-2 col-span-2 md:col-span-1 border-r border-slate-200 pr-4">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Diskon (%)</label>
                                        <input
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
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Diskon (Rp)</label>
                                        <input
                                            type="text"
                                            value={totalDiscount ? totalDiscount.toLocaleString('id-ID') : ""}
                                            onChange={e => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                setTotalDiscount(val === '' ? '' : Number(val));
                                                setTotalDiscountPercent("");
                                            }}
                                            className="w-full bg-white border-2 border-slate-300 px-3 py-2 rounded-xl text-lg font-black text-primary outline-none focus:border-primary transition-all h-12 shadow-sm"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1 col-span-2 md:col-span-1 pl-0 md:pl-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Pajak PPN (%)</label>
                                    <select
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

                        <div className="flex flex-col justify-center p-8 bg-slate-900 rounded-[2.5rem] text-white border-2 border-slate-800 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/30 transition-all duration-700" />
                            <div className="space-y-3 pb-4 border-b border-white/10 relative z-10">
                                <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                                    <span>TOTAL QTY</span>
                                    <span className="font-mono text-white tracking-widest">{totalQty.toLocaleString('id-ID')}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                                    <span>SUBTOTAL ITEM (Bruto)</span>
                                    <span className="font-mono text-white tracking-widest">{formatCurrency(grossAmount)}</span>
                                </div>
                                {showDiscount && (
                                    <>
                                        <div className="flex justify-between items-center text-xs font-bold text-orange-400">
                                            <span>TOTAL POTONGAN ITEM</span>
                                            <span className="font-mono">- {formatCurrency(grossAmount - subtotal)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs font-bold text-primary">
                                            <span>DISKON FINAL</span>
                                            <span className="font-mono font-black italic">- {formatCurrency(finalDiscountNominal)}</span>
                                        </div>
                                    </>
                                )}
                                <div className="flex justify-between items-center text-xs font-bold text-indigo-400">
                                    <span>PPN ({taxRate}%)</span>
                                    <span className="font-mono tracking-widest">+ {formatCurrency(taxAmount)}</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center pt-4 relative z-10">
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Grand Total Akhir</p>
                                    <h4 className="text-4xl font-black text-primary tracking-tighter drop-shadow-md">
                                        {formatCurrency(grandTotal)}
                                    </h4>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-bold text-slate-500 block">Metode: API/Hutang</span>
                                    <span className="text-xs font-bold text-primary italic uppercase tracking-tighter bg-primary/10 px-2 py-0.5 rounded mt-1 inline-block border border-primary/20">Checked by System</span>
                                </div>
                            </div>
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
                </form >
            </div >
        </div >
    );
}
