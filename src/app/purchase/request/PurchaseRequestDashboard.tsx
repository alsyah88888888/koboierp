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

export function PurchaseRequestDashboard({ purchaseRequests }: {
    purchaseRequests: any[]
}) {
    const { data: session } = useSession() as any;
    const userRole = session?.user?.role || "";
    const userId = session?.user?.id || "";

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [previewTitle, setPreviewTitle] = useState("");

    const filteredRequests = (purchaseRequests || []).filter(r =>
        r.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.requestedBy?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleExport = () => {
        const data = filteredRequests.map(r => ({
            'No. PR': r.number,
            'Tanggal': format(new Date(r.createdAt), "dd/MM/yyyy HH:mm"),
            'Pemohon': r.requestedBy?.name,
            'Status': r.status,
            'Catatan': r.notes,
            'Total Qty': r.items.reduce((acc: number, i: any) => acc + i.quantity, 0)
        }));
        exportToExcel(data, 'Laporan_Pengajuan_Pembelian', 'Pengajuan');
    };

    const handlePreview = () => {
        const data = filteredRequests.map(r => ({
            'No. PR': r.number,
            'Tanggal': format(new Date(r.createdAt), "dd/MM/yyyy HH:mm"),
            'Pemohon': r.requestedBy?.name,
            'Status': r.status,
            'Total Qty': r.items.reduce((acc: number, i: any) => acc + i.quantity, 0)
        }));
        setPreviewData(data);
        setPreviewTitle("Riwayat Pengajuan Pembelian (PR)");
        setShowPreview(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hide-print px-1">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-primary uppercase">Purchase Request</h2>
                    <p className="text-muted-foreground text-[10px] md:text-sm font-bold uppercase tracking-widest opacity-70">Internal procurement requests</p>
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
                        <span>Create PR</span>
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
                    <h3 className="text-lg font-bold">Data Pengajuan Pembelian</h3>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                />
            </div>

            {isModalOpen && (
                <PurchaseRequestModal
                    onClose={() => setIsModalOpen(false)}
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
