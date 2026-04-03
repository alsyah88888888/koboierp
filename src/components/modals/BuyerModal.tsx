"use client";

import { useState } from "react";
import { X, Users } from "lucide-react";
import { callAction } from "@/proxy";


export function BuyerModal({ onClose, onSuccess }: { onClose: () => void, onSuccess?: (buyer: any) => void }) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        address: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const customer = await callAction("createCustomer", formData);

            alert("Buyer / Customer berhasil ditambahkan!");
            if (onSuccess) onSuccess(customer);
            onClose();
        } catch (error: any) {
            alert(error.message || "Terjadi kesalahan saat menyimpan data buyer.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Tambah Buyer Baru</h2>
                            <p className="text-xs text-slate-500">Form input cepat master customer</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="h-5 w-5 text-slate-500" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase">Nama Buyer / Toko *</label>
                        <input
                            required
                            autoFocus
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                            className="w-full p-2.5 border-2 border-slate-200 rounded-lg focus:border-primary outline-none text-sm font-bold uppercase placeholder:font-normal"
                            placeholder="Contoh: TOKO ABADI"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase">Email / PIC</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="w-full p-2.5 border-2 border-slate-200 rounded-lg focus:border-primary outline-none text-sm"
                                placeholder="Opsional"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase">No. Telepon / WA</label>
                            <input
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full p-2.5 border-2 border-slate-200 rounded-lg focus:border-primary outline-none text-sm"
                                placeholder="Opsional"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase">Alamat Pengiriman</label>
                        <textarea
                            value={formData.address}
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                            className="w-full p-2.5 border-2 border-slate-200 rounded-lg focus:border-primary outline-none text-sm resize-none"
                            placeholder="Alamat lengkap tujuan pengiriman..."
                            rows={3}
                        />
                    </div>

                    <div className="pt-4 border-t mt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-6 py-2.5 text-sm font-bold bg-primary text-white rounded-lg hover:bg-primary/90 shadow-lg shadow-primary/30 transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {isLoading ? "Menyimpan..." : "Simpan Buyer"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
