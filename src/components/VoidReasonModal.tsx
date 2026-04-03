"use client";

import { useState } from "react";
import { X, AlertTriangle, ShieldAlert } from "lucide-react";

interface VoidReasonModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    title?: string;
    message?: string;
}

export function VoidReasonModal({ isOpen, onClose, onConfirm, title = "Batalkan Transaksi", message = "Apakah Anda yakin ingin membatalkan transaksi ini? Stok akan otomatis dikembalikan/disesuaikan." }: VoidReasonModalProps) {
    const [reason, setReason] = useState("");
    const [error, setError] = useState("");

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!reason.trim()) {
            setError("Alasan pembatalan wajib diisi.");
            return;
        }
        if (reason.trim().length < 5) {
            setError("Alasan terlalu pendek. Harap berikan alasan yang jelas.");
            return;
        }
        onConfirm(reason);
        setReason("");
        setError("");
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header Decoration */}
                <div className="h-2 bg-rose-500" />
                
                <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl ring-1 ring-rose-100">
                                <ShieldAlert className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">{title}</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit Policy Required</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            <X className="h-5 w-5 text-slate-400" />
                        </button>
                    </div>

                    <div className="bg-rose-50/50 border border-rose-100 p-4 rounded-2xl mb-6">
                        <div className="flex gap-3">
                            <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />
                            <p className="text-xs font-bold text-rose-700 leading-relaxed">
                                {message}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">
                                Alasan Pembatalan (Mandatory)
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => {
                                    setReason(e.target.value);
                                    if (e.target.value.trim()) setError("");
                                }}
                                placeholder="Contoh: Salah input Qty, Retur total, atau kesalahan data..."
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-900 focus:outline-none focus:border-rose-500 focus:bg-white transition-all ring-rose-500/5 focus:ring-4 min-h-[120px] resize-none"
                            />
                            {error && (
                                <p className="text-[10px] font-black text-rose-500 uppercase mt-2 ml-1 animate-pulse">
                                    {error}
                                </p>
                            )}
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={onClose}
                                className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="flex-[2] px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-200 active:scale-95"
                            >
                                Konfirmasi Void
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
