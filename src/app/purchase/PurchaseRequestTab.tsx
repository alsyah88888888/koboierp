"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { Clock, CheckCircle2, XCircle, ShieldCheck, Trash2, Eye, ChevronDown, ChevronUp, Printer } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { updatePurchaseRequestStatusAction, deletePurchaseRequestAction } from "@/app/actions";

export function PurchaseRequestTab({ requests, userRole, userId }: { requests: any[], userRole: string, userId: string }) {
    const [loading, setLoading] = useState<string | null>(null);
    const [expandedPr, setExpandedPr] = useState<string | null>(null);

    const handleStatusUpdate = async (id: string, status: any) => {
        const confirmMsg = status === "REJECTED" ? "Yakin ingin menolak pengajuan ini?" : "Konfirmasi persetujuan/verifikasi pengajuan ini?";
        if (!confirm(confirmMsg)) return;

        setLoading(id);
        try {
            const res = await updatePurchaseRequestStatusAction(id, status);
            if (res.success) {
                alert("Status pengajuan diperbarui.");
            }
        } catch (error: any) {
            alert(error.message || "Gagal memperbarui status");
        } finally {
            setLoading(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus pengajuan ini secara permanen?")) return;
        try {
            await deletePurchaseRequestAction(id);
            alert("Pengajuan dihapus.");
        } catch (error: any) {
            alert(error.message || "Gagal menghapus");
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PENDING":
                return <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1 w-fit"><Clock className="h-3 w-3" /> Menunggu Admin</span>;
            case "APPROVED_BY_ADMIN":
                return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1 w-fit"><Clock className="h-3 w-3" /> Menunggu Finance</span>;
            case "VERIFIED_BY_FINANCE":
                return <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1 w-fit"><CheckCircle2 className="h-3 w-3" /> Terverifikasi</span>;
            case "REJECTED":
                return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1 w-fit"><XCircle className="h-3 w-3" /> Ditolak</span>;
            default:
                return status;
        }
    };

    return (
        <div className="table-responsive">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 border-b-2 border-slate-50 text-[10px] uppercase font-black tracking-widest sticky top-0 z-10">
                    <tr>
                        <th className="px-6 py-4 w-10"></th>
                        <th className="px-6 py-4">No. Pengajuan / Tgl</th>
                        <th className="px-6 py-4">Pemohon</th>
                        <th className="px-6 py-4">Ringkasan Barang</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Est. Total</th>
                        <th className="px-6 py-4 text-center">Aksi</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {requests.map((pr: any) => {
                        const isExpanded = expandedPr === pr.id;
                        const totalEst = pr.items.reduce((acc: number, item: any) => acc + (item.quantity * Number(item.estimatedPrice)), 0);

                        return (
                            <React.Fragment key={pr.id}>
                                <tr className={cn("hover:bg-muted/10 transition-colors", isExpanded && "bg-muted/5")}>
                                    <td className="px-6 py-4">
                                        <button onClick={() => setExpandedPr(isExpanded ? null : pr.id)} className="p-1 hover:bg-slate-100 rounded">
                                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-mono text-primary font-bold">
                                            {pr.number && pr.number.startsWith('PR-') ? pr.number : (
                                                <span className="text-red-500 text-[10px] italic">Nomor Tidak Valid</span>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">{format(new Date(pr.date), "dd/MM/yyyy HH:mm")}</div>
                                    </td>
                                    <td className="px-6 py-4 font-medium">
                                        {pr.requestedBy?.name || "Unknown"}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                                            {pr.items.slice(0, 2).map((item: any) => (
                                                <span key={item.id} className="bg-slate-100 text-[10px] px-1.5 py-0.5 rounded border border-slate-200 text-slate-600 truncate max-w-full">
                                                    {item.itemName} ({item.quantity})
                                                </span>
                                            ))}
                                            {pr.items.length > 2 && <span className="text-[10px] text-muted-foreground">+{pr.items.length - 2} lagi</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(pr.status)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-black text-slate-700">
                                        {formatCurrency(totalEst)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            {/* Admin Approval */}
                                            {userRole === "ADMIN" && pr.status === "PENDING" && (
                                                <button
                                                    disabled={loading === pr.id}
                                                    onClick={() => handleStatusUpdate(pr.id, "APPROVED_BY_ADMIN")}
                                                    className="bg-primary text-white px-3 py-1.5 rounded text-[10px] font-bold hover:bg-primary/90 transition-all shrink-0"
                                                >
                                                    {loading === pr.id ? "..." : "Setuju (Admin)"}
                                                </button>
                                            )}

                                            {/* Finance Verification */}
                                            {(userRole === "FINANCE" || userRole === "ADMIN") && pr.status === "APPROVED_BY_ADMIN" && (
                                                <button
                                                    disabled={loading === pr.id}
                                                    onClick={() => handleStatusUpdate(pr.id, "VERIFIED_BY_FINANCE")}
                                                    className="bg-emerald-600 text-white px-3 py-1.5 rounded text-[10px] font-bold hover:bg-emerald-700 transition-all shrink-0"
                                                >
                                                    {loading === pr.id ? "..." : "Verifikasi (Finance)"}
                                                </button>
                                            )}

                                            {/* Reject Button (for Admin & Finance) */}
                                            {((userRole === "ADMIN" && (pr.status === "PENDING" || pr.status === "APPROVED_BY_ADMIN")) || (userRole === "FINANCE" && pr.status === "APPROVED_BY_ADMIN")) && (
                                                <button
                                                    disabled={loading === pr.id}
                                                    onClick={() => handleStatusUpdate(pr.id, "REJECTED")}
                                                    className="border-2 border-red-200 text-red-600 p-1.5 rounded hover:bg-red-50 transition-all"
                                                    title="Tolak"
                                                >
                                                    <XCircle className="h-4 w-4" />
                                                </button>
                                            )}

                                            {/* Print Button */}
                                            <a
                                                href={`/purchase/request/print/${pr.id}`}
                                                target="_blank"
                                                className="p-1.5 text-slate-400 hover:text-slate-900 rounded transition-colors"
                                            >
                                                <Printer className="h-4 w-4" />
                                            </a>

                                            {/* Delete Button */}
                                            {(userRole === "ADMIN" || pr.requestedById === userId) && (
                                                <button
                                                    onClick={() => handleDelete(pr.id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-500 rounded transition-colors"
                                                    title="Hapus"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                                {isExpanded && (
                                    <tr className="bg-slate-50/50">
                                        <td colSpan={7} className="px-4 md:px-12 py-6 border-b">
                                            <div className="space-y-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    <div>
                                                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Item Detail</h4>
                                                        <div className="space-y-2">
                                                            {pr.items.map((item: any) => (
                                                                <div key={item.id} className="flex justify-between items-center text-xs p-2 bg-white rounded border border-slate-100">
                                                                    <span className="font-medium text-slate-600">
                                                                        {item.itemName}
                                                                    </span>
                                                                    <span className="font-bold">{item.quantity} x {formatCurrency(Number(item.estimatedPrice))}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div>
                                                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Catatan Pemohon</h4>
                                                            <p className="text-sm italic text-slate-600">{pr.notes || "Tidak ada catatan."}</p>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            {pr.approvedBy && (
                                                                <div>
                                                                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Approve By (Admin)</h4>
                                                                    <p className="text-xs font-bold text-slate-800">{pr.approvedBy.name}</p>
                                                                    <p className="text-[10px] text-muted-foreground">{format(new Date(pr.approvedAt), "dd/MM/yy HH:mm")}</p>
                                                                </div>
                                                            )}
                                                            {pr.verifiedBy && (
                                                                <div>
                                                                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Verify By (Finance)</h4>
                                                                    <p className="text-xs font-bold text-slate-800">{pr.verifiedBy.name}</p>
                                                                    <p className="text-[10px] text-muted-foreground">{format(new Date(pr.verifiedAt), "dd/MM/yy HH:mm")}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        );
                    })}
                    {requests.length === 0 && (
                        <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic">
                                Tidak ada data pengajuan pembelian.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
