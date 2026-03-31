"use client";

import { useState } from "react";
import { X, Megaphone, Send, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import { createNotificationAction } from "@/app/actions";
import { toast } from "react-hot-toast";

interface BroadcastModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function BroadcastModal({ isOpen, onClose }: BroadcastModalProps) {
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [type, setType] = useState("broadcast");
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !message) {
            toast.error("Judul dan pesan wajib diisi");
            return;
        }

        setIsLoading(true);
        try {
            const res = await createNotificationAction({ title, message, type });
            if (res.success) {
                toast.success("Siaran berhasil dikirim ke semua pengguna");
                setTitle("");
                setMessage("");
                setType("broadcast");
                onClose();
            }
        } catch (error: any) {
            toast.error(error.message || "Gagal mengirim siaran");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="bg-primary p-6 text-white relative">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                            <Megaphone className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight">Kirim Informasi Massal</h2>
                            <p className="text-white/70 text-xs font-medium">Pesan akan tampil di semua akun pengguna</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 hover:bg-white/20 rounded-xl transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Judul Informasi</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Contoh: PENGUMUMAN MAINTENANCE"
                            className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-3 rounded-2xl outline-none focus:border-primary focus:bg-white transition-all font-semibold text-slate-700"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Pesan / Konten</label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Tuliskan detail informasi yang ingin disampaikan..."
                            rows={4}
                            className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-4 rounded-2xl outline-none focus:border-primary focus:bg-white transition-all font-semibold text-slate-700 resize-none resize-y"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 px-1 text-center">Tipe Notifikasi</label>
                        <div className="grid grid-cols-4 gap-3">
                            {[
                                { id: 'broadcast', icon: Megaphone, label: 'Siaran', color: 'bg-amber-500' },
                                { id: 'info', icon: Info, label: 'Info', color: 'bg-blue-500' },
                                { id: 'alert', icon: AlertTriangle, label: 'Peringatan', color: 'bg-rose-500' },
                                { id: 'success', icon: CheckCircle2, label: 'Selesai', color: 'bg-emerald-500' },
                            ].map((t) => (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setType(t.id)}
                                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all group ${type === t.id
                                            ? 'border-primary bg-primary/5 shadow-inner'
                                            : 'border-slate-100 bg-white hover:border-slate-200'
                                        }`}
                                >
                                    <div className={`p-2 rounded-lg text-white ${t.color} group-hover:scale-110 transition-transform`}>
                                        <t.icon className="h-4 w-4" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-tighter">{t.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-4 rounded-2xl border-2 border-slate-100 text-slate-500 font-black uppercase tracking-widest hover:bg-slate-50 transition-all text-xs"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-[2] bg-primary text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-primary-hover shadow-lg shadow-primary/30 transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                            Kirim Sekarang
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
