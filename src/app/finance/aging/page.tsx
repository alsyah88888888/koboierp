"use client";

import React, { useState, useEffect } from "react";
import { getAgingReportAction } from "@/actions/finance";
import { AgingRecord } from "@/lib/services/aging-service";
import Link from "next/link";
import { ArrowLeft, RefreshCw, FileText, Download } from "lucide-react";

export default function AgingReportPage() {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"receivables" | "payables">("receivables");
    const [receivables, setReceivables] = useState<AgingRecord[]>([]);
    const [payables, setPayables] = useState<AgingRecord[]>([]);
    const [summary, setSummary] = useState({ totalAR: 0, totalAP: 0 });

    const fetchReport = async () => {
        setLoading(true);
        try {
            const result = await getAgingReportAction();
            if (result.success) {
                setReceivables(result.receivables);
                setPayables(result.payables);
                setSummary(result.summary);
            }
        } catch (error) {
            console.error("Failed to fetch aging report:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, []);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(value);
    };

    const currentData = activeTab === "receivables" ? receivables : payables;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/finance" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6 text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Laporan Umur Hutang & Piutang</h1>
                        <p className="text-gray-500">Aging Report (A/R & A/P)</p>
                    </div>
                </div>
                <button 
                    onClick={fetchReport}
                    disabled={loading}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Data
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div 
                    onClick={() => setActiveTab("receivables")}
                    className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${activeTab === 'receivables' ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 hover:border-blue-300'}`}
                >
                    <h2 className="text-lg font-semibold text-gray-600 mb-2">Total Piutang (A/R)</h2>
                    <p className="text-3xl font-bold text-blue-700">{formatCurrency(summary.totalAR)}</p>
                    <p className="text-sm text-gray-500 mt-2">Tagihan ke pelanggan yang belum lunas</p>
                </div>
                <div 
                    onClick={() => setActiveTab("payables")}
                    className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${activeTab === 'payables' ? 'border-red-500 bg-red-50 shadow-md' : 'border-gray-200 hover:border-red-300'}`}
                >
                    <h2 className="text-lg font-semibold text-gray-600 mb-2">Total Hutang (A/P)</h2>
                    <p className="text-3xl font-bold text-red-700">{formatCurrency(summary.totalAP)}</p>
                    <p className="text-sm text-gray-500 mt-2">Tagihan dari supplier yang belum dibayar</p>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-700 text-lg">
                        Rincian {activeTab === "receivables" ? "Piutang Pelanggan" : "Hutang Supplier"}
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-100 text-gray-600 text-sm">
                                <th className="p-4 border-b font-medium">{activeTab === "receivables" ? "Pelanggan" : "Supplier"}</th>
                                <th className="p-4 border-b font-medium text-right">0-30 Hari</th>
                                <th className="p-4 border-b font-medium text-right">31-60 Hari</th>
                                <th className="p-4 border-b font-medium text-right">61-90 Hari</th>
                                <th className="p-4 border-b font-medium text-right">&gt; 90 Hari</th>
                                <th className="p-4 border-b font-bold text-right text-gray-800">Total Belum Bayar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">Memuat data...</td>
                                </tr>
                            ) : currentData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">Tidak ada data {activeTab === "receivables" ? "piutang" : "hutang"}.</td>
                                </tr>
                            ) : (
                                currentData.map((record, index) => (
                                    <React.Fragment key={record.id + index}>
                                        <tr className="border-b hover:bg-gray-50 transition-colors group">
                                            <td className="p-4 font-medium text-gray-800">{record.name}</td>
                                            <td className={`p-4 text-right ${record.buckets["0-30"] > 0 ? 'text-gray-700' : 'text-gray-300'}`}>
                                                {formatCurrency(record.buckets["0-30"])}
                                            </td>
                                            <td className={`p-4 text-right ${record.buckets["31-60"] > 0 ? 'text-yellow-600 font-medium' : 'text-gray-300'}`}>
                                                {formatCurrency(record.buckets["31-60"])}
                                            </td>
                                            <td className={`p-4 text-right ${record.buckets["61-90"] > 0 ? 'text-orange-600 font-medium' : 'text-gray-300'}`}>
                                                {formatCurrency(record.buckets["61-90"])}
                                            </td>
                                            <td className={`p-4 text-right ${record.buckets[">90"] > 0 ? 'text-red-600 font-bold' : 'text-gray-300'}`}>
                                                {formatCurrency(record.buckets[">90"])}
                                            </td>
                                            <td className="p-4 text-right font-bold text-gray-800 bg-gray-50 group-hover:bg-gray-100">
                                                {formatCurrency(record.totalUnpaid)}
                                            </td>
                                        </tr>
                                        {/* Optional: Expandable details could go here, but for now we keep it simple */}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                        {!loading && currentData.length > 0 && (
                            <tfoot className="bg-gray-100 font-bold text-gray-800">
                                <tr>
                                    <td className="p-4">TOTAL KESELURUHAN</td>
                                    <td className="p-4 text-right">
                                        {formatCurrency(currentData.reduce((sum, item) => sum + item.buckets["0-30"], 0))}
                                    </td>
                                    <td className="p-4 text-right text-yellow-700">
                                        {formatCurrency(currentData.reduce((sum, item) => sum + item.buckets["31-60"], 0))}
                                    </td>
                                    <td className="p-4 text-right text-orange-700">
                                        {formatCurrency(currentData.reduce((sum, item) => sum + item.buckets["61-90"], 0))}
                                    </td>
                                    <td className="p-4 text-right text-red-700">
                                        {formatCurrency(currentData.reduce((sum, item) => sum + item.buckets[">90"], 0))}
                                    </td>
                                    <td className="p-4 text-right text-lg">
                                        {formatCurrency(currentData.reduce((sum, item) => sum + item.totalUnpaid, 0))}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
}
