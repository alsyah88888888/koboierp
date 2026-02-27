"use client";

import { useState } from "react";
import { Plus, Warehouse as WarehouseIcon, AlertTriangle, Layers, Trash2, ClipboardCheck, FileText } from "lucide-react";
import { StockInputModal } from "./StockInputModal";
import { CheckerBoard } from "./CheckerBoard";
import { DashboardStats } from "../components/DashboardStats";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { deleteProductAction } from "@/app/actions";

export function WarehouseDashboard({ initialProducts, warehouses, unverifiedReceipts }: {
    initialProducts: any[],
    warehouses: any[],
    unverifiedReceipts: any[]
}) {
    const { data: session } = useSession() as any;
    const isAdmin = session?.user?.role === "ADMIN";
    const isWarehouse = session?.user?.role === "WAREHOUSE" || isAdmin;
    const [showInputModal, setShowInputModal] = useState(false);
    const [activeTab, setActiveTab] = useState<"inventory" | "checker">("inventory");

    const handleDeleteProduct = async (id: string) => {
        if (!confirm("Hapus produk ini? Semua data stok terkait juga akan dihapus.")) return;
        try {
            await deleteProductAction(id);
            alert("Produk berhasil dihapus");
        } catch (e: any) {
            alert(e.message || "Gagal menghapus produk");
        }
    };

    const lowStock = initialProducts.filter((p: any) => {
        const total = p.stocks.reduce((sum: number, s: any) => sum + s.quantity, 0);
        return total <= p.lowStockThreshold;
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-primary">Kola Borasi Inventory</h2>
                    <p className="text-muted-foreground">Monitor stock levels, multi-warehouse distribution, and checker verification.</p>
                </div>
                <div className="flex gap-3">
                    <div className="flex bg-muted p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab("inventory")}
                            className={cn("px-4 py-1.5 rounded-md text-sm font-bold transition-all", activeTab === "inventory" ? "bg-white shadow text-primary" : "text-muted-foreground")}
                        >
                            Inventory
                        </button>
                        <button
                            onClick={() => setActiveTab("checker")}
                            className={cn("px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-2", activeTab === "checker" ? "bg-white shadow text-primary" : "text-muted-foreground")}
                        >
                            Checker
                            {unverifiedReceipts.length > 0 && <span className="bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{unverifiedReceipts.length}</span>}
                        </button>
                    </div>

                    <button
                        onClick={() => window.print()}
                        className="bg-white border-2 border-slate-200 text-slate-700 px-4 py-2 rounded-md flex items-center gap-2 hover:bg-slate-50 transition-colors font-bold shadow-sm"
                    >
                        <FileText className="h-4 w-4" />
                        <span>Cetak Stok</span>
                    </button>
                    <button
                        onClick={() => setShowInputModal(true)}
                        className="bg-primary text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90 transition-colors font-bold shadow-lg shadow-primary/20"
                    >
                        <Plus className="h-4 w-4 text-white" />
                        <span className="text-white">Stock Entry</span>
                    </button>
                </div>
            </div>

            <DashboardStats />

            {activeTab === "checker" ? (
                <CheckerBoard unverifiedReceipts={unverifiedReceipts} />
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="p-6 rounded-xl border bg-card flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total SKUs</p>
                                <h3 className="text-2xl font-bold mt-2">{initialProducts.length}</h3>
                            </div>
                            <Layers className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="p-6 rounded-xl border bg-card flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Warehouses</p>
                                <h3 className="text-2xl font-bold mt-2">{warehouses.length}</h3>
                            </div>
                            <WarehouseIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="p-6 rounded-xl border bg-card flex items-start justify-between text-amber-500">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Low Stock SKUs</p>
                                <h3 className="text-2xl font-bold mt-2">{lowStock.length}</h3>
                            </div>
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-xl border bg-card">
                            <div className="p-6 border-b flex justify-between items-center text-amber-500">
                                <h3 className="text-lg font-semibold">Stock Alerts</h3>
                            </div>
                            <div className="p-0">
                                {lowStock.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground italic">No low stock alerts today.</div>
                                ) : (
                                    <ul className="divide-y max-h-[400px] overflow-y-auto">
                                        {lowStock.map((p: any) => (
                                            <li key={p.id} className="p-4 flex flex-col gap-1 hover:bg-muted/30 transition-colors">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-medium text-sm">{p.name}</span>
                                                    <span className="text-xs text-amber-500 font-bold">
                                                        {p.stocks.reduce((acc: number, s: any) => acc + s.quantity, 0)} left
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-muted-foreground uppercase">{p.sku} • {p.brand}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        <div className="rounded-xl border bg-card">
                            <div className="p-6 border-b flex justify-between items-center text-primary">
                                <h3 className="text-lg font-semibold">Master Stock Overview</h3>
                            </div>
                            <div className="overflow-x-auto max-h-[400px]">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted/50 text-muted-foreground sticky top-0 bg-card border-b z-10">
                                        <tr>
                                            <th className="px-6 py-3">SKU</th>
                                            <th className="px-6 py-3">Product Name</th>
                                            <th className="px-6 py-3 text-right">Total Qty</th>
                                            {isAdmin && <th className="px-6 py-3 text-center">Aksi</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y overflow-y-auto">
                                        {initialProducts.slice(0, 50).map((p: any) => {
                                            const totalQty = p.stocks.reduce((acc: number, s: any) => acc + s.quantity, 0);
                                            return (
                                                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                                                    <td className="px-6 py-4 font-mono text-[10px]">{p.sku}</td>
                                                    <td className="px-6 py-4 text-xs font-medium">{p.name}</td>
                                                    <td className={cn("px-6 py-4 text-right font-bold", totalQty <= p.lowStockThreshold ? "text-amber-500" : "text-emerald-500")}>
                                                        {totalQty}
                                                    </td>
                                                    {isAdmin && (
                                                        <td className="px-6 py-4 text-center">
                                                            <button
                                                                onClick={() => handleDeleteProduct(p.id)}
                                                                className="p-1 text-muted-foreground hover:text-red-600 rounded transition-colors"
                                                                title="Hapus Produk"
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                        {initialProducts.length > 50 && (
                                            <tr>
                                                <td colSpan={3} className="px-6 py-4 text-center text-muted-foreground italic text-xs">
                                                    Showing first 50 items. Use search for more.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {showInputModal && <StockInputModal products={initialProducts} warehouses={warehouses} onClose={() => setShowInputModal(false)} />}
                </>
            )
            }
        </div >
    );
}
