"use client";

import { useState } from "react";
import { Plus, Search, Eye, Download, FileText } from "lucide-react";
import { ReportPreviewModal } from "@/components/ReportPreviewModal";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import { exportToExcel } from "@/lib/excel";
import { PurchaseRequestTab } from "../PurchaseRequestTab";
import { PurchaseRequestModal } from "../PurchaseRequestModal";
import { PurchaseRequestStats } from "./PurchaseRequestStats";

export function PurchaseRequestDashboard({ purchaseRequests, coa = [] }: {
    purchaseRequests: any[],
    coa?: any[]
}) {
    const { data: session } = useSession() as any;
    const userRole = session?.user?.role || "";
    const userId = session?.user?.id || "";

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPr, setEditingPr] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [previewTitle, setPreviewTitle] = useState("");

    const filteredRequests = (purchaseRequests || []).filter(r =>
        r.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.requestedBy?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleEdit = (pr: any) => {
        setEditingPr(pr);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingPr(null);
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "PENDING": return "MENUNGGU ADMIN";
            case "APPROVED_BY_ADMIN": return "MENUNGGU FINANCE";
            case "VERIFIED_BY_FINANCE": return "TERVERIFIKASI";
            case "EXECUTED": return "TERBAYAR";
            case "REJECTED": return "DITOLAK";
            default: return status;
        }
    };

    const handleExport = () => {
        const data = filteredRequests.map(r => ({
            'No. Pengajuan': r.number,
            'Tanggal': format(new Date(r.date || r.createdAt), "dd/MM/yyyy HH:mm"),
            'Pemohon': r.requestedBy?.name,
            'Ringkasan Barang': r.items.map((i: any) => `${i.itemName} (${i.quantity})`).join(", "),
            'Tipe': r.category || "PEMBELIAN",
            'Status': getStatusLabel(r.status),
            'Catatan': r.notes || "-",
            'Total Estimasi': r.items.reduce((acc: number, i: any) => acc + (i.quantity * Number(i.estimatedPrice)), 0)
        }));
        exportToExcel(data, 'Laporan_Pengajuan_Pembelian', 'Pengajuan');
    };

    const handlePreview = () => {
        const data = filteredRequests.map(r => ({
            'No. Pengajuan': r.number,
            'Tanggal': format(new Date(r.date || r.createdAt), "dd/MM/yyyy HH:mm"),
            'Pemohon': r.requestedBy?.name,
            'Ringkasan Barang': r.items.map((i: any) => `${i.itemName} (${i.quantity})`).join(", "),
            'Tipe': r.category || "PEMBELIAN",
            'Status': getStatusLabel(r.status),
            'Total Estimasi': r.items.reduce((acc: number, i: any) => acc + (i.quantity * Number(i.estimatedPrice)), 0)
        }));
        setPreviewData(data);
        setPreviewTitle("Riwayat Pengajuan Pembelian (PR)");
        setShowPreview(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hide-print px-1">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">Menu Pengajuan</h1>
                    <p className="text-slate-500 text-[10px] md:text-sm font-bold uppercase tracking-widest opacity-70">Draft dokumen pembelian & operasional</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <button
                        onClick={handlePreview}
                        className="w-full sm:w-auto bg-white border-2 border-slate-200 text-slate-600 px-6 py-2 rounded-full flex items-center justify-center gap-2 hover:bg-slate-50 transition-all font-black uppercase text-[10px] tracking-widest active:scale-95 shadow-sm"
                    >
                        <Eye className="h-4 w-4" />
                        <span>Preview</span>
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="w-full sm:w-auto bg-primary text-white px-6 py-2 rounded-full flex items-center justify-center gap-2 hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95 font-black uppercase text-[10px] tracking-widest"
                    >
                        <Plus className="h-4 w-4 text-white" />
                        <span>Buat Pengajuan</span>
                    </button>
                    <button
                        onClick={handleExport}
                        className="w-full sm:w-auto bg-emerald-600 text-white px-6 py-2 rounded-full flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95 font-black uppercase text-[10px] tracking-widest"
                    >
                        <Download className="h-4 w-4" />
                        <span>Excel</span>
                    </button>
                </div>
            </div>

            <div className="hide-print">
                <PurchaseRequestStats />
            </div>

            <div className="rounded-xl border bg-card shadow-sm">
                <div className="p-6 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-primary">
                    <h3 className="text-lg font-bold">Data Pengajuan (Draft)</h3>
                    <div className="relative w-full md:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Cari PR / Pemohon..."
                            className="w-full pl-10 pr-4 py-2 bg-muted/50 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                </div>

                <PurchaseRequestTab
                    requests={filteredRequests}
                    userRole={userRole}
                    userId={userId}
                    coa={coa}
                    onEdit={handleEdit}
                />
            </div>

            {isModalOpen && (
                <PurchaseRequestModal
                    onClose={handleCloseModal}
                    initialPr={editingPr}
                />
            )}

            {showPreview && (
                <ReportPreviewModal
                    title={previewTitle}
                    data={previewData}
                    onClose={() => setShowPreview(false)}
                    onExport={handleExport}
                />
            )}
        </div>
    );
}
