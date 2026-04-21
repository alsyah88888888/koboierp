
"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, Save, Calculator, FileText, CheckCircle } from "lucide-react";
import { callAction } from "@/proxy";
import { useDialog } from "@/components/ui/DialogProvider";
import { formatCurrency } from "@/lib/utils";

interface SalesOrderModalProps {
    products: any[];
    customers: any[];
    warehouses: any[];
    initialData?: any;
    onClose: () => void;
}

export default function SalesOrderModal({ products, customers, warehouses, initialData, onClose }: SalesOrderModalProps) {
    const { alert } = useDialog();
    const [loading, setLoading] = useState(false);
    const [buyerName, setBuyerName] = useState(initialData?.buyerName || "");
    const [recipient, setRecipient] = useState(initialData?.recipient || "");
    const [warehouseId, setWarehouseId] = useState(initialData?.warehouseId || warehouses[0]?.id || "");
    const [date, setDate] = useState(initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    const [salesPerson, setSalesPerson] = useState(initialData?.salesPerson || "");
    const [items, setItems] = useState<any[]>(initialData?.items?.map((i: any) => ({
        productId: i.productId,
        quantity: i.quantity,
        salesPrice: i.salesPrice,
        discount: i.discount,
        uom: i.uom
    })) || [{ productId: "", quantity: 1, salesPrice: 0, discount: 0, uom: "" }]);

    const [taxRate, setTaxRate] = useState(initialData?.taxRate || 0);

    const addItem = () => {
        setItems([...items, { productId: "", quantity: 1, salesPrice: 0, discount: 0, uom: "" }]);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index][field] = value;
        
        if (field === "productId") {
            const product = products.find(p => p.id === value);
            if (product) {
                newItems[index].salesPrice = Number(product.salesPrice);
                newItems[index].uom = product.uom;
            }
        }
        setItems(newItems);
    };

    const subtotal = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.salesPrice)) - Number(item.discount), 0);
    const taxAmount = subtotal * taxRate;
    const grandTotal = subtotal + taxAmount;

    const handleSubmit = async (isConfirm: boolean = false) => {
        if (!buyerName || items.some(i => !i.productId)) {
            await alert({ title: "Data Tidak Lengkap", message: "Mohon isi nama buyer dan semua produk.", type: "warning" });
            return;
        }

        setLoading(true);
        try {
            const data = {
                buyerName,
                recipient,
                warehouseId,
                date: new Date(date),
                salesPerson,
                items,
                taxRate,
                status: isConfirm ? "CONFIRMED" : "DRAFT"
            };

            if (initialData?.id) {
                await callAction("updateSalesOrder", initialData.id, data);
            } else {
                await callAction("createSalesOrder", data);
            }

            await alert({ 
                title: "Berhasil", 
                message: isConfirm ? "PO Penjualan berhasil dibuat dan dikonfirmasi." : "PI (Proforma Invoice) berhasil disimpan sebagai Draft.", 
                type: "success" 
            });
            window.location.reload();
        } catch (e: any) {
            await alert({ title: "Gagal", message: e.message || "Terjadi kesalahan.", type: "danger" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200 scale-in-center">
                {/* Header */}
                <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3 uppercase">
                            <div className="p-2 bg-primary rounded-xl text-white">
                                <FileText className="h-6 w-6" />
                            </div>
                            {initialData ? "Edit Order" : "Input Proforma Invoice (PI)"}
                        </h2>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1 opacity-70">Sales Workflow: PI → PO → SJ</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-rose-50 hover:text-rose-500 rounded-2xl transition-all group">
                        <X className="h-6 w-6 text-slate-400 group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Buyer / Pelanggan</label>
                            <input 
                                value={buyerName}
                                onChange={e => setBuyerName(e.target.value)}
                                className="erp-input w-full"
                                placeholder="Nama Toko / Pelanggan"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tanggal</label>
                            <input 
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="erp-input w-full"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Sales Person</label>
                            <select 
                                value={salesPerson}
                                onChange={e => setSalesPerson(e.target.value)}
                                className="erp-input w-full"
                            >
                                <option value="">Pilih Sales</option>
                                <option value="BC">BC</option>
                                <option value="PF">PF</option>
                                <option value="UMUM">UMUM</option>
                            </select>
                        </div>
                        <div className="md:col-span-3 space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Alamat Pengiriman</label>
                            <textarea 
                                value={recipient}
                                onChange={e => setRecipient(e.target.value)}
                                className="erp-input w-full min-h-[80px]"
                                placeholder="Alamat lengkap penerima..."
                            />
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Daftar Barang Pesanan</h3>
                            <button onClick={addItem} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all shadow-md active:scale-95">
                                <Plus className="h-4 w-4" />
                                Tambah Baris
                            </button>
                        </div>

                        <div className="border rounded-[2rem] overflow-hidden bg-slate-50/30">
                            <table className="w-full text-left">
                                <thead className="bg-white border-b">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Produk</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 w-32 text-right">Qty</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 w-48 text-right">Harga Jual</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 w-48 text-right">Total</th>
                                        <th className="px-6 py-4 w-16"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {items.map((item, idx) => (
                                        <tr key={idx} className="group hover:bg-white transition-colors">
                                            <td className="px-4 py-3">
                                                <select 
                                                    value={item.productId}
                                                    onChange={e => updateItem(idx, "productId", e.target.value)}
                                                    className="erp-input w-full bg-transparent border-transparent focus:bg-white focus:border-primary"
                                                >
                                                    <option value="">Pilih Produk...</option>
                                                    {products.map(p => (
                                                        <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-4 py-3">
                                                <input 
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={e => updateItem(idx, "quantity", e.target.value)}
                                                    className="erp-input w-full text-right bg-transparent border-transparent focus:bg-white focus:border-primary"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input 
                                                    type="number"
                                                    value={item.salesPrice}
                                                    onChange={e => updateItem(idx, "salesPrice", e.target.value)}
                                                    className="erp-input w-full text-right bg-transparent border-transparent focus:bg-white focus:border-primary font-mono text-indigo-600 font-bold"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-right font-black text-slate-900 pr-8">
                                                {formatCurrency(Number(item.quantity) * Number(item.salesPrice))}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button onClick={() => removeItem(idx)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="flex flex-col md:flex-row justify-between items-start gap-8 bg-slate-50 p-8 rounded-[2rem] border border-slate-200">
                        <div className="space-y-4 w-full md:w-1/2">
                            <div className="flex items-center gap-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gudang Pengeluaran</label>
                                <select 
                                    value={warehouseId}
                                    onChange={e => setWarehouseId(e.target.value)}
                                    className="erp-input py-2 text-xs"
                                >
                                    {warehouses.map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pajak (PPN 11%)</label>
                                <input 
                                    type="checkbox"
                                    checked={taxRate > 0}
                                    onChange={e => setTaxRate(e.target.checked ? 0.11 : 0)}
                                    className="w-5 h-5 rounded-lg border-2 border-slate-300 text-primary focus:ring-primary"
                                />
                            </div>
                        </div>

                        <div className="w-full md:w-96 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="font-bold text-slate-400 uppercase tracking-widest">Subtotal</span>
                                <span className="font-black text-slate-900">{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="font-bold text-slate-400 uppercase tracking-widest">PPN (11%)</span>
                                <span className="font-black text-slate-900">{formatCurrency(taxAmount)}</span>
                            </div>
                            <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                                <span className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Grand Total</span>
                                <span className="text-3xl font-black text-primary tracking-tighter">{formatCurrency(grandTotal)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-8 border-t flex flex-col md:flex-row justify-end gap-4 bg-slate-50/50">
                    <button 
                        onClick={onClose}
                        disabled={loading}
                        className="px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all"
                    >
                        Batal
                    </button>
                    <button 
                        onClick={() => handleSubmit(false)}
                        disabled={loading}
                        className="px-8 py-3 rounded-2xl bg-white border-2 border-slate-200 text-slate-900 text-[10px] font-black uppercase tracking-widest hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                        <Save className="h-4 w-4" />
                        Simpan sebagai PI (Draft)
                    </button>
                    <button 
                        onClick={() => handleSubmit(true)}
                        disabled={loading}
                        className="px-8 py-4 rounded-2xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-primary/20 active:scale-95"
                    >
                        <CheckCircle className="h-5 w-5" />
                        Konfirmasi Jadi PO
                    </button>
                </div>
            </div>
        </div>
    );
}
