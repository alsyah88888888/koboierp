'use client';

import React, { useState, useEffect } from 'react';
import { callAction } from '@/proxy';
import { Loader2, Save } from 'lucide-react';

interface TraceabilityReallocateModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: {
        sdItemId: string;
        productId: string;
        productName: string;
        buyerName: string;
        sjNumber: string;
        currentLotId: string | null;
        qty: number;
    } | null;
}

export function TraceabilityReallocateModal({ isOpen, onClose, data }: TraceabilityReallocateModalProps) {
    const [lots, setLots] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedLotId, setSelectedLotId] = useState<string>('');

    useEffect(() => {
        if (isOpen && data) {
            setSelectedLotId(data.currentLotId || '');
            fetchLots();
        }
    }, [isOpen, data]);

    const fetchLots = async () => {
        if (!data) return;
        setIsLoading(true);
        try {
            const res = await callAction('getAvailableLotsForProductAction', data.productId, data.currentLotId || undefined);
            if (!res?.error) {
                setLots(res);
            } else {
                alert(res.error);
            }
        } catch (e: any) {
            alert(e.message || 'Gagal memuat daftar pembelian');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!data || !selectedLotId) return;
        
        if (selectedLotId === data.currentLotId) {
            onClose();
            return;
        }

        setIsSaving(true);
        try {
            const res = await callAction('reallocateLotAction', data.sdItemId, selectedLotId);
            if (res.success) {
                alert('Lot berhasil diubah. HPP dan Margin telah diperbarui.');
                onClose();
            } else {
                alert(res.error || 'Gagal merubah lot');
            }
        } catch (e: any) {
            alert(e.message || 'Gagal merubah lot');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen || !data) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={onClose} />
            
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden transform transition-all">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-800">Ubah Rujukan Pembelian (Lot)</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-500">
                        <span className="sr-only">Close</span>
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm mb-4">
                        <p><strong>Item:</strong> {data.productName}</p>
                        <p><strong>Penjualan:</strong> {data.sjNumber} - {data.buyerName} ({data.qty} qty)</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Pilih Nota Pembelian (Lot)
                        </label>
                        {isLoading ? (
                            <div className="flex items-center space-x-2 text-slate-500 text-sm">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Memuat daftar pembelian...</span>
                            </div>
                        ) : (
                            <select
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                value={selectedLotId}
                                onChange={(e) => setSelectedLotId(e.target.value)}
                            >
                                <option value="" disabled>-- Pilih Pembelian --</option>
                                {lots.map((lot: any) => (
                                    <option key={lot.id} value={lot.id}>
                                        {lot.grNumber} | Tgl: {new Date(lot.createdAt).toLocaleDateString('id-ID')} | {lot.supplierName} | Harga: Rp {Number(lot.purchasePrice).toLocaleString('id-ID')}
                                    </option>
                                ))}
                            </select>
                        )}
                        <p className="text-xs text-slate-500 mt-2">
                            Memilih nota pembelian di sini akan mengunci HPP item ini secara permanen ke harga nota tersebut.
                        </p>
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !selectedLotId || isLoading}
                        className="flex items-center px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Simpan Perubahan
                    </button>
                </div>
            </div>
        </div>
    );
}
