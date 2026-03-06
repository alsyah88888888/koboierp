"use client";

import { useState, useEffect } from "react";
import {
    Package,
    Truck,
    Users,
    Warehouse,
    Plus,
    Search,
    Pencil,
    Trash2,
    X,
    ChevronRight,
    Filter,
    ArrowUpDown,
    CheckCircle2
} from "lucide-react";
import {
    createProductAction,
    updateProductAction,
    deleteProductAction,
    createVendorAction,
    updateVendorAction,
    deleteVendorAction,
    createCustomerAction,
    updateCustomerAction,
    deleteCustomerAction,
    createWarehouseAction,
    updateWarehouseAction,
    deleteWarehouseAction,
    getMDAction
} from "@/app/actions";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";

type MDType = "product" | "vendor" | "customer" | "warehouse";

export function MasterDataDashboard() {
    const { data: session } = useSession();
    const isAdmin = (session?.user as any)?.role === "ADMIN";

    const [activeTab, setActiveTab] = useState<MDType>("product");
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);

    const [data, setData] = useState({
        products: [] as any[],
        vendors: [] as any[],
        customers: [] as any[],
        warehouses: [] as any[]
    });

    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState({
        sku: "", name: "", category: "", uom: "", barcode: "",
        email: "", phone: "", address: "",
        location: ""
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await getMDAction();
            setData({
                products: res.products || [],
                vendors: res.vendors || [],
                customers: res.customers || [],
                warehouses: res.warehouses || []
            });
        } catch (e) {
            console.error("Failed to load master data", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const filteredData = (() => {
        const list = data[`${activeTab}s` as keyof typeof data] || [];
        if (!searchQuery) return list;
        const q = searchQuery.toLowerCase();
        return list.filter((item: any) =>
            (item.name?.toLowerCase().includes(q)) ||
            (item.sku?.toLowerCase().includes(q)) ||
            (item.phone?.toLowerCase().includes(q)) ||
            (item.location?.toLowerCase().includes(q))
        );
    })();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (activeTab === "product") {
                if (editId) await updateProductAction(editId, { sku: form.sku, name: form.name, category: form.category, uom: form.uom, barcode: form.barcode });
                else await createProductAction({ sku: form.sku, name: form.name, category: form.category, uom: form.uom, barcode: form.barcode });
            } else if (activeTab === "vendor") {
                if (editId) await updateVendorAction(editId, { name: form.name, email: form.email, phone: form.phone, address: form.address });
                else await createVendorAction({ name: form.name, email: form.email, phone: form.phone, address: form.address });
            } else if (activeTab === "customer") {
                if (editId) await updateCustomerAction(editId, { name: form.name, email: form.email, phone: form.phone, address: form.address });
                else await createCustomerAction({ name: form.name, email: form.email, phone: form.phone, address: form.address });
            } else if (activeTab === "warehouse") {
                if (editId) await updateWarehouseAction(editId, { name: form.name, location: form.location });
                else await createWarehouseAction({ name: form.name, location: form.location });
            }

            setShowModal(false);
            setEditId(null);
            setForm({ sku: "", name: "", category: "", uom: "", barcode: "", email: "", phone: "", address: "", location: "" });
            loadData();
        } catch (e: any) {
            alert(e.message || "Gagal menyimpan data.");
        }
    };

    const handleEdit = (item: any) => {
        setEditId(item.id);
        setForm({
            sku: item.sku || "",
            name: item.name || "",
            category: item.category || "",
            uom: item.uom || item.unit || "",
            barcode: item.barcode || "",
            email: item.email || "",
            phone: item.phone || "",
            address: item.address || "",
            location: item.location || ""
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!isAdmin) return alert("Hanya Admin yang bisa menghapus data.");
        if (!confirm("Hapus data ini?")) return;

        try {
            if (activeTab === "product") await deleteProductAction(id);
            else if (activeTab === "vendor") await deleteVendorAction(id);
            else if (activeTab === "customer") await deleteCustomerAction(id);
            else if (activeTab === "warehouse") await deleteWarehouseAction(id);
            loadData();
        } catch (e: any) {
            alert(e.message || "Gagal menghapus data.");
        }
    };

    const tabs = [
        { id: "product", name: "Products", icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
        { id: "vendor", name: "Suppliers", icon: Truck, color: "text-amber-600", bg: "bg-amber-50" },
        { id: "customer", name: "Buyers", icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" },
        { id: "warehouse", name: "Warehouses", icon: Warehouse, color: "text-emerald-600", bg: "bg-emerald-50" },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Master Data Management</h1>
                    <p className="text-slate-500 font-medium whitespace-nowrap">Centralized management for products, partners, and locations.</p>
                </div>
                <button
                    onClick={() => { setEditId(null); setShowModal(true); setForm({ sku: "", name: "", category: "", uom: "", barcode: "", email: "", phone: "", address: "", location: "" }); }}
                    className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
                >
                    <Plus className="h-5 w-5 text-white" />
                    <span className="text-white">Add {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</span>
                </button>
            </div>

            <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id as MDType); setSearchQuery(""); }}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all",
                            activeTab === tab.id
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <tab.icon className={cn("h-4 w-4", activeTab === tab.id ? tab.color : "text-slate-400")} />
                        {tab.name}
                    </button>
                ))}
            </div>

            <div className="bg-white border-2 border-slate-200 rounded-3xl shadow-sm overflow-hidden min-h-[500px]">
                <div className="p-6 border-b-2 border-slate-50 flex flex-col md:flex-row gap-4 justify-between bg-slate-50/50">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder={`Search ${activeTab}s by name, SKU, or details...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-primary transition-all text-sm font-semibold"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center space-y-4">
                        <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">Loading Data...</p>
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="p-20 text-center">
                        <div className="inline-flex p-6 bg-slate-50 rounded-full mb-4">
                            <Search className="h-10 w-10 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">No {activeTab}s found</h3>
                        <p className="text-slate-500 font-medium">Try adjusting your search or add a new entry.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50/80 text-slate-500 border-b-2 border-slate-100">
                                {activeTab === "product" && (
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest">Barang / SKU</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest">Kategori</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest">UOM</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest">Aksi</th>
                                    </tr>
                                )}
                                {(activeTab === "vendor" || activeTab === "customer") && (
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest">Nama / Partner</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest">Kontak</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest">Alamat</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest">Aksi</th>
                                    </tr>
                                )}
                                {activeTab === "warehouse" && (
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest">Nama Gudang</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest">Lokasi</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest">Aksi</th>
                                    </tr>
                                )}
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredData.map((item: any) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                        {activeTab === "product" && (
                                            <>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-800 group-hover:text-primary transition-colors">{item.name}</div>
                                                    <div className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">{item.sku}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase">
                                                        {item.category || "Uncategorized"}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-bold text-slate-500 uppercase">
                                                    {item.uom || item.unit || "-"}
                                                </td>
                                            </>
                                        )}
                                        {(activeTab === "vendor" || activeTab === "customer") && (
                                            <>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-800">{item.name}</div>
                                                    <div className="text-[10px] text-slate-400 font-medium">#{item.id.slice(-6).toUpperCase()}</div>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-semibold text-slate-600">
                                                    {item.phone && <div>{item.phone}</div>}
                                                    {item.email && <div className="text-slate-400">{item.email}</div>}
                                                    {!item.phone && !item.email && <span className="text-slate-300 italic">No contact</span>}
                                                </td>
                                                <td className="px-6 py-4 text-xs text-slate-500 font-medium max-w-xs truncate">
                                                    {item.address || "-"}
                                                </td>
                                            </>
                                        )}
                                        {activeTab === "warehouse" && (
                                            <>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-800">{item.name}</div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                                                    {item.location || "-"}
                                                </td>
                                            </>
                                        )}
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                {isAdmin && (
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100">
                        <div className="flex justify-between items-center mb-8">
                            <div className="flex items-center gap-3">
                                <div className={cn("p-3 rounded-2xl", tabs.find(t => t.id === activeTab)?.bg)}>
                                    {(() => {
                                        const Icon = tabs.find(t => t.id === activeTab)?.icon || Plus;
                                        return <Icon className={cn("h-6 w-6", tabs.find(t => t.id === activeTab)?.color)} />;
                                    })()}
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                                    {editId ? 'Edit' : 'Add New'} {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                                </h3>
                            </div>
                            <button type="button" onClick={() => { setShowModal(false); setEditId(null); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="h-6 w-6 text-slate-400" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Nama Lengkap / Identity Name</label>
                                    <input
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-3.5 rounded-2xl outline-none focus:border-primary focus:bg-white transition-all font-bold text-slate-700"
                                        placeholder={`Enter ${activeTab} name...`}
                                        required
                                    />
                                </div>

                                {activeTab === "product" && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">SKU Code</label>
                                                <input
                                                    value={form.sku}
                                                    onChange={e => setForm({ ...form, sku: e.target.value })}
                                                    className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-3.5 rounded-2xl outline-none focus:border-primary focus:bg-white transition-all font-bold text-slate-700"
                                                    placeholder="e.g. PRD-001"
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Kategori</label>
                                                <input
                                                    value={form.category}
                                                    onChange={e => setForm({ ...form, category: e.target.value })}
                                                    className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-3.5 rounded-2xl outline-none focus:border-primary focus:bg-white transition-all font-bold text-slate-700"
                                                    placeholder="e.g. Beverage"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Unit (UOM)</label>
                                                <input
                                                    value={form.uom}
                                                    onChange={e => setForm({ ...form, uom: e.target.value })}
                                                    className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-3.5 rounded-2xl outline-none focus:border-primary focus:bg-white transition-all font-bold text-slate-700"
                                                    placeholder="e.g. PCS, BOX"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Barcode</label>
                                                <input
                                                    value={form.barcode}
                                                    onChange={e => setForm({ ...form, barcode: e.target.value })}
                                                    className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-3.5 rounded-2xl outline-none focus:border-primary focus:bg-white transition-all font-bold text-slate-700"
                                                    placeholder="Optional"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {activeTab === "warehouse" ? (
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Lokasi / Address</label>
                                        <input
                                            value={form.location}
                                            onChange={e => setForm({ ...form, location: e.target.value })}
                                            className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-3.5 rounded-2xl outline-none focus:border-primary focus:bg-white transition-all font-bold text-slate-700"
                                            placeholder="Physical location..."
                                            required
                                        />
                                    </div>
                                ) : (activeTab === "vendor" || activeTab === "customer") && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Phone</label>
                                                <input
                                                    value={form.phone}
                                                    onChange={e => setForm({ ...form, phone: e.target.value })}
                                                    className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-3.5 rounded-2xl outline-none focus:border-primary focus:bg-white transition-all font-bold text-slate-700"
                                                    placeholder="08XXX..."
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Email</label>
                                                <input
                                                    type="email"
                                                    value={form.email}
                                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                                    className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-3.5 rounded-2xl outline-none focus:border-primary focus:bg-white transition-all font-bold text-slate-700"
                                                    placeholder="name@email.com"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Full Address</label>
                                            <textarea
                                                value={form.address}
                                                rows={3}
                                                onChange={e => setForm({ ...form, address: e.target.value })}
                                                className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-3.5 rounded-2xl outline-none focus:border-primary focus:bg-white transition-all font-bold text-slate-700 resize-none"
                                                placeholder="Street, City, Zip..."
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => { setShowModal(false); setEditId(null); }}
                                    className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                                >
                                    Cancel
                                </button>
                                <button className="flex-[2] bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95">
                                    {editId ? 'Update Record' : 'Create Record'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
