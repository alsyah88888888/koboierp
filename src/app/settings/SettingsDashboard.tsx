"use client";

import { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import {
    Building2,
    Globe,
    CreditCard,
    Users,
    Package,
    Truck,
    ShoppingBag,
    Warehouse,
    Save,
    CheckCircle2,
    Upload,
    Trash2,
    AlertCircle,
    Plus,
    X,
    Banknote
} from "lucide-react";
import {
    wipeDatabaseAction,
    importProductsAction,
    createProductAction,
    getSystemSettingsAction,
    updateSystemSettingsAction,
    createVendorAction,
    deleteVendorAction,
    createCustomerAction,
    deleteCustomerAction,
    createWarehouseAction,
    deleteWarehouseAction,
    setOpeningBalanceAction,
    getMDAction
} from "@/app/actions";

export function SettingsDashboard() {
    const [saved, setSaved] = useState(false);
    const [isWiping, setIsWiping] = useState(false);
    const [importStatus, setImportStatus] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [vendors, setVendors] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [coa, setCoa] = useState<any[]>([]);
    const [showMDModal, setShowMDModal] = useState<"product" | "vendor" | "customer" | "warehouse" | "opening" | null>(null);

    const [mdForm, setMdForm] = useState({
        sku: "", name: "", category: "", uom: "", barcode: "",
        email: "", phone: "", address: "",
        location: "", accountId: "", amount: 0
    });

    const [company, setCompany] = useState({
        name: "PT. Kola Borasi Indonesia",
        address: "Jl. Arjuna IV Green Kartika Residence Blok EE NO.2, CIBINONG, KAB. BOGOR - JAWA BARAT, 16911",
        taxId: "01.234.567.8-012.000",
        website: "www.kolaborasi.id"
    });

    const [counts, setCounts] = useState({
        product: 0,
        vendor: 0,
        customer: 0,
        warehouse: 0
    });

    const loadData = async () => {
        const settingsData = await getSystemSettingsAction();
        setCompany({
            name: settingsData.settings.companyName,
            address: settingsData.settings.address,
            taxId: settingsData.settings.taxId,
            website: settingsData.settings.website
        });
        setCounts(settingsData.counts);

        const md = await getMDAction();
        setVendors(md.vendors);
        setCustomers(md.customers);
        setWarehouses(md.warehouses);
        setCoa(md.coa);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleMDSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (showMDModal === "product") await createProductAction({ sku: mdForm.sku, name: mdForm.name, category: mdForm.category, uom: mdForm.uom, barcode: mdForm.barcode });
            else if (showMDModal === "vendor") await createVendorAction({ name: mdForm.name, email: mdForm.email, phone: mdForm.phone, address: mdForm.address });
            else if (showMDModal === "customer") await createCustomerAction({ name: mdForm.name, email: mdForm.email, phone: mdForm.phone, address: mdForm.address });
            else if (showMDModal === "warehouse") await createWarehouseAction({ name: mdForm.name, location: mdForm.location });
            else if (showMDModal === "opening") await setOpeningBalanceAction({ accountId: mdForm.accountId, amount: mdForm.amount });

            alert("Data berhasil disimpan.");
            setShowMDModal(null);
            setMdForm({ sku: "", name: "", category: "", uom: "", barcode: "", email: "", phone: "", address: "", location: "", accountId: "", amount: 0 });
            loadData();
        } catch (e: any) {
            alert(e.message || "Gagal menyimpan data.");
        }
    };

    const handleDeleteMD = async (type: string, id: string) => {
        if (!confirm("Hapus data ini?")) return;
        try {
            if (type === "vendor") await deleteVendorAction(id);
            else if (type === "customer") await deleteCustomerAction(id);
            else if (type === "warehouse") await deleteWarehouseAction(id);
            loadData();
        } catch (e: any) {
            alert(e.message || "Gagal menghapus data.");
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateSystemSettingsAction({
                companyName: company.name,
                address: company.address,
                taxId: company.taxId,
                website: company.website
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            alert("Gagal menyimpan pengaturan.");
        }
    };

    const handleWipe = async () => {
        if (!confirm("APAKAH ANDA YAKIN? Semua data transaksi, stok, dan jurnal keuangan akan dihapus secara permanen! Data Master (Produk, Vendor, Gudang) akan dipertahankan.")) return;

        setIsWiping(true);
        try {
            await wipeDatabaseAction();
            alert("Database berhasil dibersihkan!");
            // Refresh counts
            const data = await getSystemSettingsAction();
            setCounts(data.counts);
        } catch (error) {
            alert("Gagal menghapus database.");
        } finally {
            setIsWiping(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportStatus("Membaca file...");
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);

                setImportStatus(`Mengimport ${jsonData.length} produk...`);

                const products = jsonData.map((row: any) => ({
                    sku: row.SKU || row.Kode || row.sku,
                    name: row.Nama || row.Name || row.name,
                    category: row.Kategori || row.Category,
                    unit: row.Satuan || row.Unit,
                    barcode: row.Barcode || row.barcode,
                    purchasePrice: Number(row["Harga Beli"] || row.purchasePrice || 0),
                    salesPrice: Number(row["Harga Jual"] || row.salesPrice || 0),
                    lowStockThreshold: Number(row["Stok Minimum"] || row.lowStockThreshold || 10)
                })).filter((p: any) => p.sku && p.name);

                const result = await importProductsAction(products);
                if (result.success) {
                    setImportStatus(`Berhasil! ${result.count} produk diimport.`);
                    // Refresh counts
                    const updateData = await getSystemSettingsAction();
                    setCounts(updateData.counts);
                }
            } catch (error) {
                console.error(error);
                setImportStatus("Gagal mengimport file. Pastikan format kolom benar.");
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const masterData = [
        { name: "Produk", icon: Package, count: `${counts.product} Items`, href: "/warehouse", type: "product" },
        { name: "Vendor / Supplier", icon: Truck, count: `${counts.vendor} Vendors`, href: "/purchase", type: "vendor" },
        { name: "Customer / Buyer", icon: Users, count: `${counts.customer} Customers`, href: "/sales", type: "customer" },
        { name: "Gudang / Cabang", icon: Warehouse, count: `${counts.warehouse} Locations`, href: "/warehouse", type: "warehouse" },
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">System Settings</h1>
                <p className="text-slate-500 font-medium">Manage company profile, system preferences, and master data.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white border-2 border-slate-200 rounded-3xl p-8 shadow-sm">
                        <div className="flex items-center gap-3 mb-8 pb-4 border-b-2 border-slate-50">
                            <div className="bg-primary/10 p-2.5 rounded-xl">
                                <Building2 className="h-6 w-6 text-primary" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800">Company Profile</h2>
                        </div>

                        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Company Name</label>
                                <input
                                    value={company.name}
                                    onChange={e => setCompany({ ...company, name: e.target.value })}
                                    className="w-full bg-white border-2 border-slate-200 px-4 py-3 rounded-xl focus:border-primary outline-none transition-all font-semibold text-slate-700"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Address</label>
                                <textarea
                                    value={company.address}
                                    onChange={e => setCompany({ ...company, address: e.target.value })}
                                    rows={3}
                                    className="w-full bg-white border-2 border-slate-200 px-4 py-3 rounded-xl focus:border-primary outline-none transition-all font-semibold text-slate-700 resize-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Tax ID (NPWP)</label>
                                <div className="relative">
                                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        value={company.taxId}
                                        onChange={e => setCompany({ ...company, taxId: e.target.value })}
                                        className="w-full bg-white border-2 border-slate-200 pl-11 pr-4 py-3 rounded-xl focus:border-primary outline-none transition-all font-semibold text-slate-700"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Website</label>
                                <div className="relative">
                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        value={company.website}
                                        onChange={e => setCompany({ ...company, website: e.target.value })}
                                        className="w-full bg-white border-2 border-slate-200 pl-11 pr-4 py-3 rounded-xl focus:border-primary outline-none transition-all font-semibold text-slate-700"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2 flex justify-end pt-4">
                                <button
                                    type="submit"
                                    className="bg-primary text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 flex items-center gap-2"
                                >
                                    {saved ? <CheckCircle2 className="h-5 w-5 text-white" /> : <Save className="h-5 w-5 text-white" />}
                                    <span className="text-white">{saved ? "Settings Saved" : "Save Changes"}</span>
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden group">
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold">Automatic Backups</h3>
                                <p className="text-slate-400 text-sm">Your database is backed up every 24 hours to secure storage.</p>
                                <button className="mt-4 bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-xl text-sm font-bold transition-all border border-white/10">
                                    <span className="text-white">Run Backup Now</span>
                                </button>
                            </div>
                            <div className="bg-primary/20 p-6 rounded-full group-hover:scale-110 transition-transform">
                                <Save className="h-10 w-10 text-primary" />
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-slate-50 border-2 border-slate-200 rounded-3xl p-8 shadow-sm">
                            <div className="flex items-center gap-3 mb-4 text-slate-800">
                                <Upload className="h-6 w-6 text-blue-500" />
                                <h3 className="text-lg font-bold">Import Master Data</h3>
                            </div>
                            <p className="text-slate-500 text-sm mb-6 font-medium">Upload file Excel atau CSV untuk memasukkan data Produk secara massal.</p>

                            <input
                                type="file"
                                hidden
                                ref={fileInputRef}
                                accept=".xlsx, .xls, .csv"
                                onChange={handleFileUpload}
                            />

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full bg-white border-2 border-slate-200 hover:border-blue-500 text-slate-700 px-6 py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 group"
                            >
                                <Upload className="h-5 w-5 group-hover:text-blue-500 text-slate-700" />
                                <span className="text-slate-700">Pilih File Excel</span>
                            </button>
                            {importStatus && (
                                <p className="mt-3 text-xs font-bold text-blue-600 animate-pulse">{importStatus}</p>
                            )}

                            <div className="mt-6 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                                <h4 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" /> Petunjuk Format Kolom
                                </h4>
                                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                                    Gunakan header: <span className="text-slate-800 font-bold">SKU, Nama, Kategori, Satuan, Harga Beli, Harga Jual, Stok Minimum</span>.
                                    File dapat berupa .xlsx atau .csv.
                                </p>
                            </div>
                        </div>

                        <div className="bg-red-50 border-2 border-red-100 rounded-3xl p-8 shadow-sm group hover:border-red-500 transition-colors">
                            <div className="flex items-center gap-3 mb-4 text-red-700">
                                <Trash2 className="h-6 w-6" />
                                <h3 className="text-lg font-bold uppercase tracking-tighter">Danger Zone</h3>
                            </div>
                            <p className="text-red-900/60 text-sm mb-6 font-medium">Hapus semua transaksi dan jurnal. <strong>Tindakan ini tidak bisa dibatalkan!</strong></p>

                            <button
                                onClick={handleWipe}
                                disabled={isWiping}
                                className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                            >
                                <Trash2 className="h-5 w-5 text-white" />
                                <span className="text-white">{isWiping ? "Menghapus..." : "Wipe Database"}</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Master Data Summary</h3>
                            <button onClick={() => setShowMDModal("opening")} className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1">
                                <Banknote className="h-3 w-3" /> Set Saldo Awal
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            {masterData.map((item, i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border-2 border-transparent hover:border-slate-100 transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="bg-white p-3 rounded-xl group-hover:bg-primary/10 group-hover:text-primary transition-colors shadow-sm">
                                            <item.icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-800">{item.name}</div>
                                            <div className="text-xs font-medium text-slate-400">{item.count}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowMDModal(item.type as any)}
                                        className="p-2 bg-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity border hover:border-primary text-primary"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-primary/5 border-2 border-primary/10 rounded-3xl p-6 space-y-4">
                        <h3 className="text-sm font-bold text-primary uppercase tracking-widest">System Info</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 font-medium">ERP Version</span>
                                <span className="text-slate-800 font-bold">v1.3.0-enterprise</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 font-medium">Prisma Engine</span>
                                <span className="text-slate-800 font-bold">v6.19.2</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 font-medium">Latest Sync</span>
                                <span className="text-slate-800 font-bold">{new Date().toLocaleTimeString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white border-2 border-slate-200 rounded-3xl p-8 shadow-sm">
                <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                    <Users className="h-6 w-6 text-primary" />
                    Master Data Management
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Suppliers</h4>
                        <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {vendors.map(v => (
                                <div key={v.id} className="p-3 bg-slate-50 rounded-xl border flex justify-between items-center group">
                                    <div className="truncate">
                                        <div className="text-sm font-bold truncate">{v.name}</div>
                                        <div className="text-[10px] text-slate-500 truncate">{v.phone || v.email || "No contact info"}</div>
                                    </div>
                                    <button onClick={() => handleDeleteMD("vendor", v.id)} className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Buyers</h4>
                        <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {customers.map(c => (
                                <div key={c.id} className="p-3 bg-slate-50 rounded-xl border flex justify-between items-center group">
                                    <div className="truncate">
                                        <div className="text-sm font-bold truncate">{c.name}</div>
                                        <div className="text-[10px] text-slate-500 truncate">{c.phone || c.email || "No contact info"}</div>
                                    </div>
                                    <button onClick={() => handleDeleteMD("customer", c.id)} className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Warehouses</h4>
                        <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {warehouses.map(w => (
                                <div key={w.id} className="p-3 bg-slate-50 rounded-xl border flex justify-between items-center group">
                                    <div className="truncate">
                                        <div className="text-sm font-bold truncate">{w.name}</div>
                                        <div className="text-[10px] text-slate-500 truncate">{w.location}</div>
                                    </div>
                                    <button onClick={() => handleDeleteMD("warehouse", w.id)} className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {showMDModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold uppercase tracking-tight">Tambah {showMDModal === 'product' ? 'Produk' : showMDModal}</h3>
                            <button type="button" onClick={() => setShowMDModal(null)}><X className="h-6 w-6 text-slate-400" /></button>
                        </div>

                        <form onSubmit={handleMDSubmit} className="space-y-4">
                            {showMDModal === "opening" ? (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400">Account (COA)</label>
                                        <select
                                            value={mdForm.accountId}
                                            onChange={e => setMdForm({ ...mdForm, accountId: e.target.value })}
                                            className="w-full bg-slate-50 border-2 border-slate-100 px-4 py-3 rounded-xl outline-none focus:border-primary font-bold text-sm"
                                            required
                                        >
                                            <option value="">Select Account</option>
                                            {coa.map(a => (
                                                <option key={a.id} value={a.id}>({a.code}) {a.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400">Amount (IDR)</label>
                                        <input
                                            type="number"
                                            value={mdForm.amount}
                                            onChange={e => setMdForm({ ...mdForm, amount: Number(e.target.value) })}
                                            className="w-full bg-slate-50 border-2 border-slate-100 px-4 py-3 rounded-xl outline-none focus:border-primary font-bold text-sm"
                                            required
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400">Nama Lengkap</label>
                                        <input
                                            value={mdForm.name}
                                            onChange={e => setMdForm({ ...mdForm, name: e.target.value })}
                                            className="w-full bg-slate-50 border-2 border-slate-100 px-4 py-3 rounded-xl outline-none focus:border-primary font-bold text-sm"
                                            placeholder="Nama Lengkap..."
                                            required
                                        />
                                    </div>

                                    {showMDModal === "product" ? (
                                        <>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase text-slate-400">SKU / Kode unik</label>
                                                    <input
                                                        value={mdForm.sku}
                                                        onChange={e => setMdForm({ ...mdForm, sku: e.target.value })}
                                                        className="w-full bg-slate-50 border-2 border-slate-100 px-4 py-3 rounded-xl outline-none focus:border-primary font-bold text-sm"
                                                        placeholder="Kode SKU..."
                                                        required
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase text-slate-400">Kategori</label>
                                                    <input
                                                        value={mdForm.category}
                                                        onChange={e => setMdForm({ ...mdForm, category: e.target.value })}
                                                        className="w-full bg-slate-50 border-2 border-slate-100 px-4 py-3 rounded-xl outline-none focus:border-primary font-bold text-sm"
                                                        placeholder="Mis. Elektronik"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase text-slate-400">Satuan (UOM)</label>
                                                    <input
                                                        value={mdForm.uom}
                                                        onChange={e => setMdForm({ ...mdForm, uom: e.target.value })}
                                                        className="w-full bg-slate-50 border-2 border-slate-100 px-4 py-3 rounded-xl outline-none focus:border-primary font-bold text-sm"
                                                        placeholder="Mis. Pcs, Box"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase text-slate-400">Barcode (Opsional)</label>
                                                    <input
                                                        value={mdForm.barcode}
                                                        onChange={e => setMdForm({ ...mdForm, barcode: e.target.value })}
                                                        className="w-full bg-slate-50 border-2 border-slate-100 px-4 py-3 rounded-xl outline-none focus:border-primary font-bold text-sm"
                                                        placeholder="Scan Barcode"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    ) : showMDModal === "warehouse" ? (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400">Lokasi / Alamat Cabang</label>
                                            <input
                                                value={mdForm.location}
                                                onChange={e => setMdForm({ ...mdForm, location: e.target.value })}
                                                className="w-full bg-slate-50 border-2 border-slate-100 px-4 py-3 rounded-xl outline-none focus:border-primary font-bold text-sm"
                                                placeholder="Alamat lengkap lokasi..."
                                                required
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400">Kontak (HP/WhatsApp)</label>
                                                <input
                                                    value={mdForm.phone}
                                                    onChange={e => setMdForm({ ...mdForm, phone: e.target.value })}
                                                    className="w-full bg-slate-50 border-2 border-slate-100 px-4 py-3 rounded-xl outline-none focus:border-primary font-bold text-sm"
                                                    placeholder="081xxx..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400">Email Utama</label>
                                                <input
                                                    type="email"
                                                    value={mdForm.email}
                                                    onChange={e => setMdForm({ ...mdForm, email: e.target.value })}
                                                    className="w-full bg-slate-50 border-2 border-slate-100 px-4 py-3 rounded-xl outline-none focus:border-primary font-bold text-sm"
                                                    placeholder="email@perusahaan.com"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400">Alamat Lengkap</label>
                                                <textarea
                                                    value={mdForm.address}
                                                    rows={3}
                                                    onChange={e => setMdForm({ ...mdForm, address: e.target.value })}
                                                    className="w-full bg-slate-50 border-2 border-slate-100 px-4 py-3 rounded-xl outline-none focus:border-primary font-bold text-sm resize-none"
                                                    placeholder="Alamat domisili / kantor pusat..."
                                                />
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                            <button className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest mt-4 shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all">
                                Save Data
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
