
"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, Save, Calculator, FileText, CheckCircle, ChevronRight, ShoppingCart, Tag, Loader2, AlertCircle } from "lucide-react";
import { callAction } from "@/proxy";
import { useDialog } from "@/components/ui/DialogProvider";
import { formatCurrency, cn } from "@/lib/utils";

interface SalesOrderModalProps {
    products: any[];
    customers: any[];
    warehouses: any[];
    initialData?: any;
    onClose: () => void;
}

export default function SalesOrderModal({ products, customers, warehouses, initialData, onClose }: SalesOrderModalProps) {
    const { alert, prompt } = useDialog();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // State
    const [buyerName, setBuyerName] = useState(initialData?.buyerName || "");
    const [recipient, setRecipient] = useState(initialData?.recipient || "");
    const [warehouseId, setWarehouseId] = useState(initialData?.warehouseId || warehouses[0]?.id || "");
    const [date, setDate] = useState(initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    const [salesPerson, setSalesPerson] = useState(initialData?.salesPerson || "BC");
    
    const [items, setItems] = useState<any[]>(initialData?.items?.map((i: any) => ({
        productId: i.productId,
        sku: i.product?.sku || "",
        quantity: i.quantity,
        salesPrice: i.salesPrice,
        discount: i.discount || 0,
        uom: i.uom,
        vendorName: i.vendorName || "UMUM"
    })) || [{ productId: "", sku: "", quantity: 1, salesPrice: 0, discount: 0, uom: "", vendorName: "UMUM" }]);

    const [isPKP, setIsPKP] = useState(initialData?.taxRate > 0);
    const [taxRate, setTaxRate] = useState(initialData?.taxRate || 0);
    const [totalDiscount, setTotalDiscount] = useState(initialData?.totalDiscount || 0);
    const [totalDiscountPercent, setTotalDiscountPercent] = useState(0);
    const [showDiscount, setShowDiscount] = useState(false);
    const [isManualBuyer, setIsManualBuyer] = useState(false);

    const addItem = () => {
        setItems([...items, { productId: "", sku: "", quantity: 1, salesPrice: 0, discount: 0, uom: "", vendorName: "UMUM" }]);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index][field] = value;
        
        if (field === "sku") {
            const product = products.find(p => p.sku === value);
            if (product) {
                newItems[index].productId = product.id;
                newItems[index].salesPrice = Number(product.salesPrice);
                newItems[index].uom = product.uom;
            } else {
                newItems[index].productId = "";
            }
        }
        setItems(newItems);
    };

    // Calculation logic
    const grossAmount = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.salesPrice)), 0);
    const totalItemDiscounts = items.reduce((acc, item) => acc + Number(item.discount || 0), 0);
    const subtotal = Math.round(grossAmount - totalItemDiscounts);
    const totalDiscountNominal = Math.round(Number(totalDiscount) || 0);
    const dpp = subtotal - totalDiscountNominal;
    const dppNilaiLain = taxRate > 0 ? Math.round(dpp * 0.916666666666667) : 0;
    const taxAmount = taxRate > 0 ? Math.floor(dppNilaiLain * 0.12) : 0;
    const grandTotal = Math.round(dpp + taxAmount);
    const totalQty = items.reduce((acc, item) => acc + Number(item.quantity || 0), 0);

    useEffect(() => {
        if (totalDiscountPercent > 0) {
            const calculated = Math.round((totalDiscountPercent / 100) * subtotal);
            setTotalDiscount(calculated);
        }
    }, [totalDiscountPercent, subtotal]);

    const handleSubmit = async (isConfirm: boolean = false) => {
        if (!buyerName) {
            setError("Nama Buyer / Pelanggan wajib diisi.");
            return;
        }
        if (items.some(i => !i.productId)) {
            setError("Ada produk yang belum dipilih atau SKU tidak valid. Mohon pilih dari daftar.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const data = {
                buyerName,
                recipient,
                warehouseId,
                date: new Date(date),
                salesPerson,
                items,
                taxRate: isPKP ? 11 : 0, // Use 11 to match SalesModal logic
                totalDiscount,
                status: isConfirm ? "CONFIRMED" : "DRAFT"
            };

            let res;
            if (initialData?.id) {
                res = await callAction("updateSalesOrder", initialData.id, data);
            } else {
                res = await callAction("createSalesOrder", data);
            }

            if (res?.error) throw new Error(res.error);

            await alert({ 
                title: "Berhasil Disimpan", 
                message: isConfirm 
                    ? "PO Berhasil Dikonfirmasi. Sekarang Anda bisa menarik data ini di menu Surat Jalan (SJ)." 
                    : "PI Berhasil Disimpan sebagai Draft. Ingat: PI tidak akan muncul di menu Surat Jalan sampai Anda klik 'Konfirmasi Jadi PO'.", 
                type: "success" 
            });
            window.location.reload();
        } catch (e: any) {
            setError(e.message || "Terjadi kesalahan saat menyimpan data.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-6xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden border border-slate-200 scale-in-center">
                
                {/* Header */}
                <div className="p-6 lg:p-8 border-b flex justify-between items-center bg-white shrink-0">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-indigo-600 rounded-[1.5rem] text-white shadow-xl shadow-indigo-100">
                            <FileText className="h-7 w-7" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                                {initialData ? "Update Penawaran / Pesanan" : "Buat Penawaran / Pesanan"}
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Sales Workflow:</span>
                                <span className={cn("px-2 py-0.5 text-[9px] font-black rounded uppercase border", initialData?.status !== "CONFIRMED" ? "bg-indigo-50 text-indigo-600 border-indigo-100" : "bg-slate-50 text-slate-400 border-slate-100")}>PI (Penawaran)</span>
                                <ChevronRight className="h-3 w-3 text-slate-300" />
                                <span className={cn("px-2 py-0.5 text-[9px] font-black rounded uppercase border", initialData?.status === "CONFIRMED" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100")}>PO (Pesanan)</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-rose-50 hover:text-rose-500 rounded-2xl transition-all group">
                        {initialData?.revision > 0 && (
                            <div className="absolute right-20 top-8 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-200">
                                Revisi #{initialData.revision}
                            </div>
                        )}
                        <X className="h-6 w-6 text-slate-300 group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50/30 custom-scrollbar p-4 lg:p-8 space-y-8">
                    
                    {/* Guidance Alert - MORE PROMINENT */}
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-[2rem] p-6 flex items-start gap-5 shadow-sm ring-1 ring-amber-500/10">
                        <div className="bg-amber-500 text-white p-3 rounded-2xl shrink-0 shadow-lg shadow-amber-200">
                            <AlertCircle className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[11px] font-black text-amber-900 uppercase tracking-widest flex items-center gap-2">
                                PENTING: ALUR SURAT JALAN (SJ)
                            </p>
                            <p className="text-xs text-amber-800 leading-relaxed font-medium">
                                • Agar data bisa <span className="font-black italic text-orange-700">DITARIK SAAT MEMBUAT SURAT JALAN (SJ)</span>, Anda wajib menekan tombol <span className="font-black underline text-emerald-700">KONFIRMASI JADI PO</span>.<br/>
                                • Tombol <span className="font-bold">Simpan sebagai PI</span> hanya untuk penawaran harga dan tidak akan muncul di menu Surat Jalan.
                            </p>
                        </div>
                    </div>

                    {/* Basic Info Grid */}
                    <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Buyer / Customer</label>
                                <input
                                    list="customer-list-orders"
                                    value={buyerName}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setBuyerName(val);
                                        const customer = customers.find(c => c.name === val);
                                        if (customer && customer.address) setRecipient(customer.address);
                                    }}
                                    className="w-full bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-xl text-sm font-black focus:border-indigo-500 outline-none transition-all"
                                    placeholder="Search customer..."
                                />
                                <datalist id="customer-list-orders">
                                    {customers.map(c => <option key={c.id} value={c.name} />)}
                                </datalist>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Order Date</label>
                                <input 
                                    type="date"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-xl text-sm font-black focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Gudang & Sales</label>
                                <div className="flex gap-2">
                                    <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="w-full bg-slate-50 border border-slate-100 px-3 py-2.5 rounded-xl text-xs font-black focus:border-indigo-500 outline-none">
                                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                    <select value={salesPerson} onChange={e => setSalesPerson(e.target.value)} className="w-full bg-slate-50 border border-slate-100 px-3 py-2.5 rounded-xl text-xs font-black focus:border-indigo-500 outline-none">
                                        <option value="BC">BC</option>
                                        <option value="PF">PF</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex justify-between">
                                    Ship To / Address
                                    <span className="text-indigo-600 hover:underline lowercase cursor-pointer opacity-40 hover:opacity-100" onClick={() => setIsManualBuyer(!isManualBuyer)}>{isManualBuyer ? "auto" : "man"}</span>
                                </label>
                                <input
                                    value={recipient}
                                    onChange={e => setRecipient(e.target.value)}
                                    placeholder="Delivery address..."
                                    className="w-full bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-xl text-sm font-bold focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Items Section */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-2">
                            <div className="flex items-center gap-3">
                                <div className="bg-slate-900 text-white h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-black">2</div>
                                <h3 className="font-black text-slate-800 tracking-tight uppercase text-xs">Daftar Barang Pesanan</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={addItem} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-900 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100 active:scale-95">
                                    <Plus className="h-4 w-4" /> Item Baru
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setShowDiscount(!showDiscount)} 
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center gap-2",
                                        showDiscount ? "bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-100" : "bg-white border-slate-200 text-slate-500 hover:border-orange-400"
                                    )}
                                >
                                    <Tag className="h-4 w-4" /> Diskon Item
                                </button>
                            </div>
                        </div>

                        <div className="hidden lg:flex items-center gap-4 px-6 py-3 bg-slate-100/80 rounded-2xl text-[9px] font-black uppercase text-slate-500 tracking-widest border border-slate-200/50">
                            <div className="flex-[4] min-w-0">Product / SKU</div>
                            <div className="flex-[2] min-w-0">Source / Vendor</div>
                            <div className="w-20 text-center">Qty</div>
                            <div className="flex-[2] text-right pr-4">Price</div>
                            {showDiscount && <div className="w-20 text-right pr-2">Disc</div>}
                            <div className={cn(showDiscount ? "flex-[2]" : "flex-[3]", "text-right pr-6")}>Subtotal</div>
                            <div className="w-12 text-center text-rose-400">Del</div>
                        </div>

                        <div className="space-y-2 lg:space-y-1">
                            {items.map((item, index) => (
                                <div key={index} className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4 px-4 py-3 lg:p-2 bg-white lg:bg-white border border-slate-100 lg:border-slate-200 rounded-2xl lg:rounded-xl hover:border-indigo-300 transition-all group shadow-sm">
                                    <div className="w-full lg:flex-[4] min-w-0">
                                        <label className="lg:hidden text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Product</label>
                                        <input
                                            list={`product-list-orders-${index}`}
                                            value={item.sku}
                                            onChange={e => updateItem(index, 'sku', e.target.value)}
                                            className={cn("w-full bg-slate-50 border px-3 py-2 rounded-lg text-sm font-black outline-none transition-all", item.productId ? "border-transparent focus:bg-white focus:border-indigo-500" : "border-rose-300 focus:border-rose-500")}
                                            placeholder="SKU / Name"
                                        />
                                        <datalist id={`product-list-orders-${index}`}>
                                            {products.map(p => <option key={p.id} value={p.sku}>{p.name}</option>)}
                                        </datalist>
                                    </div>

                                    <div className="w-full lg:flex-[2] min-w-0">
                                        <label className="lg:hidden text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Vendor</label>
                                        <select
                                            value={item.vendorName}
                                            onChange={e => updateItem(index, 'vendorName', e.target.value)}
                                            className="w-full bg-slate-50 border border-transparent px-2 py-2 rounded-lg text-[11px] font-bold outline-none focus:bg-white focus:border-indigo-500"
                                        >
                                            <option value="UMUM">UMUM</option>
                                            <option value="MATAHARI">MATAHARI</option>
                                        </select>
                                    </div>

                                    <div className="w-full lg:w-20">
                                        <label className="lg:hidden text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block text-center">Qty</label>
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={e => updateItem(index, "quantity", e.target.value)}
                                            className="w-full bg-slate-50 border border-transparent px-1 py-2 rounded-lg text-sm font-black text-center focus:bg-white focus:border-indigo-500"
                                        />
                                    </div>

                                    <div className="w-full lg:flex-[2]">
                                        <label className="lg:hidden text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block text-right">Price</label>
                                        <input
                                            type="number"
                                            value={item.salesPrice}
                                            onChange={e => updateItem(index, "salesPrice", e.target.value)}
                                            className="w-full bg-slate-50 border border-transparent px-3 py-2 rounded-lg text-sm font-black text-right focus:bg-white focus:border-indigo-500 pr-4"
                                        />
                                    </div>

                                    {showDiscount && (
                                        <div className="w-full lg:w-20">
                                            <label className="lg:hidden text-[9px] font-black text-orange-400 uppercase tracking-widest mb-1 block text-right">Disc</label>
                                            <input
                                                type="number"
                                                value={item.discount}
                                                onChange={e => updateItem(index, "discount", e.target.value)}
                                                className="w-full bg-orange-50 border border-transparent px-1 py-2 rounded-lg text-xs font-black text-right text-orange-600 focus:bg-white focus:border-orange-500 pr-2"
                                            />
                                        </div>
                                    )}

                                    <div className={cn("hidden lg:flex items-center justify-end pr-6", showDiscount ? "lg:flex-[2]" : "lg:flex-[3]")}>
                                        <div className="text-sm font-black text-slate-800 text-right">
                                            {((Number(item.quantity) * Number(item.salesPrice)) - Number(item.discount || 0)).toLocaleString('id-ID')}
                                        </div>
                                    </div>

                                    <div className="w-full lg:w-12 flex justify-center">
                                        <button
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                            disabled={items.length === 1}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {error && (
                            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-[11px] font-black uppercase flex items-center gap-3 animate-fade-up">
                                <div className="h-2 w-2 bg-rose-500 rounded-full animate-ping"></div>
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Summary Card */}
                    <div className="mt-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                            <div className="lg:col-span-2 hidden lg:block">
                                <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 h-full flex flex-col justify-center items-center text-slate-400 shadow-sm">
                                    <ShoppingCart className="h-16 w-16 mb-4 opacity-10" />
                                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-center opacity-40 italic">Pastikan data pesanan sudah sesuai sebelum konfirmasi.</p>
                                </div>
                            </div>

                            <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden ring-1 ring-white/10">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/20 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2"></div>
                                <div className="relative z-10 space-y-6">
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5 pb-3 font-mono">Financial Summary</h3>
                                    
                                    <div className="flex justify-between items-center px-1">
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Total Brutto</span>
                                        <span className="text-base font-black font-mono">Rp {subtotal.toLocaleString('id-ID')}</span>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-orange-400 uppercase tracking-widest flex justify-between ml-1">
                                            Diskon Global
                                            <span className="text-[10px] lowercase opacity-40 cursor-pointer hover:opacity-100 transition-opacity" onClick={async () => {
                                                const p = await prompt({ title: "Diskon %", message: "Masukkan % diskon:", defaultValue: String(totalDiscountPercent) || "0", showSlider: true });
                                                if(p !== null) setTotalDiscountPercent(Number(p));
                                            }}> {totalDiscountPercent ? `${totalDiscountPercent}%` : "set %"} </span>
                                        </label>
                                        <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl px-4 font-mono">
                                            <span className="text-slate-600 font-black mr-2 text-sm">Rp</span>
                                            <input type="number" value={totalDiscount} onChange={e => setTotalDiscount(Number(e.target.value))} className="w-full bg-transparent py-3 text-base font-black text-white outline-none" placeholder="0" />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest ml-1">Tipe Faktur</label>
                                        <div className="flex gap-3">
                                            <button type="button" onClick={() => { setIsPKP(true); setTaxRate(11); }} className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border", isPKP ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-600/30' : 'bg-white/5 border-white/10 text-slate-600')}> PKP (11%) </button>
                                            <button type="button" onClick={() => { setIsPKP(false); setTaxRate(0); }} className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border", !isPKP ? 'bg-slate-700 border-slate-600 text-white shadow-xl shadow-slate-700/30' : 'bg-white/5 border-white/10 text-slate-600')}> Non PKP (0%) </button>
                                        </div>
                                    </div>

                                    <div className="pt-6 mt-4 border-t border-white/10">
                                        <div className="flex justify-between items-end mb-1.5">
                                            <label className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">Total Akhir</label>
                                            <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest mb-1">{totalQty} Items</span>
                                        </div>
                                        <p className="text-4xl font-black text-emerald-400 tracking-tighter leading-none font-mono">Rp {grandTotal.toLocaleString('id-ID')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Buttons - CLEAR AND VISIBLE */}
                <div className="p-8 border-t flex flex-col md:flex-row justify-end gap-4 bg-white shrink-0">
                    <button onClick={onClose} disabled={loading} className="px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-100 transition-all">
                        Batal
                    </button>
                    <button 
                        onClick={() => handleSubmit(false)} 
                        disabled={loading}
                        className="px-8 py-4 rounded-2xl bg-white border-2 border-slate-200 text-slate-900 text-[10px] font-black uppercase tracking-widest hover:border-indigo-600 hover:text-indigo-600 transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Simpan sebagai PI (Draft)
                    </button>
                    <button 
                        onClick={() => handleSubmit(true)} 
                        disabled={loading}
                        className="px-8 py-4 rounded-2xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all flex items-center justify-center gap-2 shadow-xl shadow-primary/20 active:scale-95 group"
                    >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5 group-hover:scale-110 transition-transform" />}
                        Konfirmasi Jadi PO
                    </button>
                </div>
            </div>
        </div>
    );
}

