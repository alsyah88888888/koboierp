"use client";

import { useState, useMemo } from "react";
import { Plus, Warehouse as WarehouseIcon, Layers, Trash2, FileText, Search, Activity, Box, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { StockInputModal } from "./StockInputModal";
import { CheckerBoard } from "./CheckerBoard";
import { DashboardStats } from "../components/DashboardStats";
import { cn, formatCurrency } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { deleteProductAction } from "@/app/actions";
import { format } from "date-fns";

export function WarehouseDashboard({ initialProducts, warehouses, unverifiedReceipts, movements }: {
    initialProducts: any[],
    warehouses: any[],
    unverifiedReceipts: any[],
    movements: any[]
}) {
    const { data: session } = useSession() as any;
    const isAdmin = session?.user?.role === "ADMIN";
    const [showInputModal, setShowInputModal] = useState(false);
    const [activeTab, setActiveTab] = useState<"inventory" | "checker">("inventory");
    const [searchTerm, setSearchTerm] = useState("");

    const filteredProducts = useMemo(() => {
        return initialProducts.filter(p =>
            p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [initialProducts, searchTerm]);

    const handleDeleteProduct = async (id: string) => {
        if (!confirm("Hapus produk ini? Semua data stok terkait juga akan dihapus.")) return;
        try {
            await deleteProductAction(id);
            alert("Produk berhasil dihapus");
            window.location.reload();
        } catch (e: any) {
            alert(e.message || "Gagal menghapus produk");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                        <WarehouseIcon className="h-8 w-8 text-primary" />
                        Management Gudang
                    </h2>
                    <p className="text-slate-500 font-medium italic">Monitoring stok, distribusi antar-gudang, dan verifikasi fisik.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-sm">
                        <button
                            onClick={() => setActiveTab("inventory")}
                            className={cn("px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all", activeTab === "inventory" ? "bg-white shadow-md text-primary" : "text-slate-500 hover:text-slate-700")}
                        >
                            Inventory
                        </button>
                        <button
                            onClick={() => setActiveTab("checker")}
                            className={cn("px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2", activeTab === "checker" ? "bg-white shadow-md text-primary" : "text-slate-500 hover:text-slate-700")}
                        >
                            Checker
                            {unverifiedReceipts.length > 0 && (
                                <span className="bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse">{unverifiedReceipts.length}</span>
                            )}
                        </button>
                    </div>

                    <button
                        onClick={() => window.print()}
                        className="bg-white border-2 border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-slate-50 transition-all font-bold shadow-sm active:scale-95"
                    >
                        <FileText className="h-4 w-4" />
                        <span>Cetak</span>
                    </button>
                    <button
                        onClick={() => setShowInputModal(true)}
                        className="bg-primary text-white px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-primary/95 transition-all font-black shadow-lg shadow-primary/20 active:scale-95 border-2 border-primary"
                    >
                        <Plus className="h-5 w-5 text-white" />
                        <span className="text-white uppercase tracking-wider text-xs">Stock Entry</span>
                    </button>
                </div>
            </div>

            <DashboardStats />

            {activeTab === "checker" ? (
                <CheckerBoard unverifiedReceipts={unverifiedReceipts} />
            ) : (
                <>
                    <div className="grid gap-6 md:grid-cols-4">
                        <div className="md:col-span-3 space-y-6">
                            {/* Warehouse Occupancy Indicators */}
                            <div className="grid gap-4 md:grid-cols-3">
                                {warehouses.map((w) => {
                                    const totalStock = w.stocks?.reduce((acc: number, s: any) => acc + s.quantity, 0) || 0;
                                    const capacity = 5000; // Placeholder capacity
                                    const percentage = Math.min(Math.round((totalStock / capacity) * 100), 100);

                                    return (
                                        <div key={w.id} className="p-5 rounded-2xl border-2 border-slate-100 bg-white shadow-sm hover:shadow-md transition-all group">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-2 bg-primary/5 rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
                                                    <WarehouseIcon className="h-5 w-5" />
                                                </div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kapasitas</span>
                                            </div>
                                            <h4 className="font-black text-slate-800 truncate mb-1">{w.name}</h4>
                                            <p className="text-[10px] text-slate-500 font-bold mb-4 uppercase">{w.location}</p>

                                            <div className="space-y-2">
                                                <div className="flex justify-between items-end">
                                                    <span className="text-lg font-black text-slate-900">{totalStock.toLocaleString()}</span>
                                                    <span className="text-[10px] font-black text-slate-400">{percentage}% Full</span>
                                                </div>
                                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-full transition-all duration-1000",
                                                            percentage > 90 ? "bg-red-500" : percentage > 70 ? "bg-amber-500" : "bg-emerald-500"
                                                        )}
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Inventory List with Search */}
                            <div className="rounded-2xl border-2 border-slate-100 bg-white shadow-sm overflow-hidden">
                                <div className="p-6 border-b-2 border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            <Box className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-slate-800">Master Stock Overview</h3>
                                            <p className="text-xs text-slate-500 font-medium">Data stok real-time seluruh gudang.</p>
                                        </div>
                                    </div>
                                    <div className="relative w-full md:w-80">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <input
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            placeholder="Cari SKU atau Nama Barang..."
                                            className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary transition-all font-medium placeholder:text-slate-400 shadow-inner"
                                        />
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50/50 text-slate-500 border-b-2 border-slate-50">
                                            <tr>
                                                <th className="px-6 py-4 uppercase text-[10px] font-black tracking-widest">Barang / SKU</th>
                                                <th className="px-6 py-4 uppercase text-[10px] font-black tracking-widest text-right">Qty Tersedia</th>
                                                <th className="px-6 py-4 uppercase text-[10px] font-black tracking-widest text-right">Status</th>
                                                {isAdmin && <th className="px-6 py-4 uppercase text-[10px] font-black tracking-widest text-center">Aksi</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {filteredProducts.slice(0, 30).map((p: any) => {
                                                const totalQty = p.stocks.reduce((acc: number, s: any) => acc + s.quantity, 0);
                                                const isLow = totalQty <= p.lowStockThreshold;
                                                return (
                                                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-slate-800">{p.name}</div>
                                                            <div className="text-[10px] font-mono text-slate-400 uppercase group-hover:text-primary transition-colors">{p.sku}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="text-lg font-black text-slate-800">{totalQty.toLocaleString()} <span className="text-[10px] text-slate-400 font-bold uppercase">{p.uom}</span></div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <span className={cn(
                                                                "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm",
                                                                isLow ? "bg-amber-100 text-amber-700 shadow-amber-100" : "bg-emerald-100 text-emerald-700 shadow-emerald-100"
                                                            )}>
                                                                {isLow ? "Low Stock" : "In Stock"}
                                                            </span>
                                                        </td>
                                                        {isAdmin && (
                                                            <td className="px-6 py-4 text-center">
                                                                <button
                                                                    onClick={() => handleDeleteProduct(p.id)}
                                                                    className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                                    title="Hapus Produk"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                            {filteredProducts.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-20 text-center text-slate-400 italic font-medium">
                                                        Tidak ada produk ditemukan dengan kata kunci "{searchTerm}"
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Recent Movements Section */}
                        <div className="md:col-span-1 space-y-6">
                            <div className="rounded-2xl border-2 border-slate-100 bg-white shadow-sm overflow-hidden h-fit">
                                <div className="p-5 border-b-2 border-slate-50 flex items-center gap-3 bg-slate-900 text-white">
                                    <Activity className="h-5 w-5 text-primary" />
                                    <h3 className="font-black text-sm uppercase tracking-widest">Recent Activity</h3>
                                </div>
                                <div className="p-5 space-y-6">
                                    {movements.length === 0 ? (
                                        <p className="text-center py-10 text-slate-400 italic text-xs">Belum ada pergerakan stok.</p>
                                    ) : (
                                        movements.map((m: any) => (
                                            <div key={m.id} className="relative pl-6 pb-6 border-l-2 border-slate-100 last:pb-0 last:border-l-0">
                                                <div className={cn(
                                                    "absolute -left-1.5 top-0 w-3 h-3 rounded-full border-2 border-white shadow-sm",
                                                    m.quantity > 0 ? "bg-emerald-500" : "bg-red-500"
                                                )} />
                                                <div className="space-y-1">
                                                    <div className="flex justify-between items-start">
                                                        <p className="text-[10px] font-black text-slate-800 line-clamp-1 uppercase leading-tight">{m.product.name}</p>
                                                        <div className={cn(
                                                            "flex items-center text-[10px] font-black",
                                                            m.quantity > 0 ? "text-emerald-600" : "text-red-600"
                                                        )}>
                                                            {m.quantity > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
                                                            {Math.abs(m.quantity)}
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{m.warehouse.name}</span>
                                                        <span className="text-[8px] font-bold text-slate-400">{format(new Date(m.createdAt), "HH:mm")}</span>
                                                    </div>
                                                    <p className="text-[9px] text-slate-500 italic bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 inline-block">{m.type}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="p-4 bg-slate-50 text-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">End of History</span>
                                </div>
                            </div>

                            <div className="p-6 rounded-2xl bg-primary text-white shadow-xl shadow-primary/20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary to-indigo-700 overflow-hidden relative group">
                                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                    <WarehouseIcon className="h-32 w-32" />
                                </div>
                                <div className="relative z-10">
                                    <h4 className="font-black text-lg mb-1 leading-tight">Warehouse Insight</h4>
                                    <p className="text-xs text-white/80 font-medium mb-4">Total Stock di seluruh gudang saat ini:</p>
                                    <div className="text-4xl font-black mb-1">
                                        {initialProducts.reduce((acc: number, p: any) => acc + p.stocks.reduce((sacc: number, s: any) => sacc + s.quantity, 0), 0).toLocaleString()}
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary-foreground/60">Items Handled</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {showInputModal && <StockInputModal products={initialProducts} warehouses={warehouses} onClose={() => {
                        setShowInputModal(false);
                        window.location.reload();
                    }} />}
                </>
            )
            }
        </div >
    );
}
