"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Search, Filter, Activity, ShieldAlert, FileText, Database, UserCheck, CreditCard, Box, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function AuditDashboard({ initialLogs }: { initialLogs: any[] }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [filterModule, setFilterModule] = useState("ALL");
    const [filterAction, setFilterAction] = useState("ALL");
    
    // Group resource by modules
    const MODULE_MAP: Record<string, string> = {
        "Product": "MASTER_DATA",
        "Vendor": "MASTER_DATA",
        "Customer": "MASTER_DATA",
        "Warehouse": "MASTER_DATA",
        "User": "SYSTEM",
        "SalesOrder": "SALES",
        "SalesDelivery": "SALES",
        "SalesReturn": "SALES",
        "PurchaseRequest": "PURCHASE",
        "PurchaseOrder": "PURCHASE",
        "GoodsReceipt": "PURCHASE",
        "PurchaseReturn": "PURCHASE",
        "FinanceTransaction": "FINANCE",
        "JournalEntry": "FINANCE",
        "BankMutation": "FINANCE",
        "LotAllocation": "INVENTORY"
    };

    const getModuleIcon = (module: string) => {
        switch (module) {
            case "MASTER_DATA": return <Database className="w-4 h-4 text-emerald-500" />;
            case "SALES": return <Activity className="w-4 h-4 text-blue-500" />;
            case "PURCHASE": return <Box className="w-4 h-4 text-orange-500" />;
            case "FINANCE": return <CreditCard className="w-4 h-4 text-purple-500" />;
            case "SYSTEM": return <ShieldAlert className="w-4 h-4 text-red-500" />;
            default: return <Settings className="w-4 h-4 text-slate-500" />;
        }
    };

    const getActionColor = (action: string) => {
        if (action.includes("CREATE") || action.includes("LOGIN") || action.includes("APPROVE")) return "bg-emerald-100 text-emerald-700";
        if (action.includes("UPDATE") || action.includes("EDIT")) return "bg-blue-100 text-blue-700";
        if (action.includes("DELETE") || action.includes("VOID") || action.includes("REJECT")) return "bg-rose-100 text-rose-700";
        return "bg-slate-100 text-slate-700";
    };

    const filteredLogs = initialLogs.filter(log => {
        const matchesSearch = !searchQuery || 
            (log.user?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (log.resourceId || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (log.action || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            JSON.stringify(log.details || {}).toLowerCase().includes(searchQuery.toLowerCase());
            
        const logModule = MODULE_MAP[log.resource] || "OTHER";
        const matchesModule = filterModule === "ALL" || logModule === filterModule;
        
        const actionType = log.action.split("_")[0];
        const matchesAction = filterAction === "ALL" || actionType === filterAction;
        
        return matchesSearch && matchesModule && matchesAction;
    });

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
            <div className="bg-white border-b-2 border-slate-200 px-6 py-4 flex items-center justify-between z-10 sticky top-0 shadow-sm">
                <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-indigo-600" />
                    Riwayat Aktivitas
                </h1>
            </div>
            
            <div className="flex-1 overflow-auto p-4 md:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    
                    {/* Header & Filters */}
                    <div className="erp-card p-6 bg-white flex flex-col md:flex-row gap-4 items-center justify-between border-slate-200">
                        <div className="flex-1 w-full">
                            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                <ShieldAlert className="w-5 h-5 text-indigo-500" />
                                Audit Trail
                            </h2>
                            <p className="text-xs text-slate-500 mt-1 font-medium">Melacak seluruh aktivitas perubahan data di dalam sistem.</p>
                        </div>
                        
                        <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Cari user, dokumen, aksi..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 pr-4 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-indigo-500 outline-none min-w-[200px]"
                                />
                            </div>
                            <select 
                                value={filterModule}
                                onChange={(e) => setFilterModule(e.target.value)}
                                className="px-4 py-2 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 bg-white"
                            >
                                <option value="ALL">Semua Modul</option>
                                <option value="MASTER_DATA">Master Data</option>
                                <option value="SALES">Penjualan</option>
                                <option value="PURCHASE">Pembelian</option>
                                <option value="FINANCE">Keuangan</option>
                                <option value="SYSTEM">Sistem</option>
                            </select>
                            <select 
                                value={filterAction}
                                onChange={(e) => setFilterAction(e.target.value)}
                                className="px-4 py-2 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 bg-white"
                            >
                                <option value="ALL">Semua Aksi</option>
                                <option value="CREATE">Create / Buat</option>
                                <option value="UPDATE">Update / Edit</option>
                                <option value="DELETE">Delete / Hapus</option>
                                <option value="VOID">Void / Batal</option>
                            </select>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="erp-card bg-white border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b-2 border-slate-100 text-xs uppercase tracking-wider text-slate-500">
                                        <th className="p-4 font-black">Waktu</th>
                                        <th className="p-4 font-black">User / Pelaku</th>
                                        <th className="p-4 font-black">Modul</th>
                                        <th className="p-4 font-black">Aksi</th>
                                        <th className="p-4 font-black">Dokumen / Target</th>
                                        <th className="p-4 font-black">IP Address</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-slate-100">
                                    {filteredLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4 whitespace-nowrap">
                                                <span className="font-mono text-slate-600 block">{format(new Date(log.createdAt), "dd MMM yyyy")}</span>
                                                <span className="text-xs text-slate-400 font-medium">{format(new Date(log.createdAt), "HH:mm:ss")}</span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                                        {log.user?.name?.charAt(0) || "?"}
                                                    </div>
                                                    <div>
                                                        <span className="font-bold text-slate-800 block">{log.user?.name || "Sistem / Guest"}</span>
                                                        <span className="text-[10px] uppercase font-bold text-slate-400">{log.user?.role || "-"}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    {getModuleIcon(MODULE_MAP[log.resource] || "OTHER")}
                                                    <span className="font-bold text-slate-700 text-xs">
                                                        {MODULE_MAP[log.resource] || "LAINNYA"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={cn(
                                                    "px-2.5 py-1 rounded-md text-[10px] font-black tracking-widest uppercase inline-block",
                                                    getActionColor(log.action)
                                                )}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="p-4 max-w-[200px] truncate">
                                                <span className="font-mono text-slate-800 font-bold block">
                                                    {log.resourceId || "-"}
                                                </span>
                                                <span className="text-[10px] text-slate-400 truncate block mt-0.5" title={JSON.stringify(log.details)}>
                                                    {log.resource} • {Object.keys(log.details || {}).length > 0 ? "Lihat Detail (Hover)" : "Tidak ada detail"}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                                    {log.ipAddress || "unknown"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredLogs.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                                                Tidak ada log aktivitas yang cocok dengan pencarian Anda.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
