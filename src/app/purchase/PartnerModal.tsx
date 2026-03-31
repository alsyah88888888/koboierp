"use client";

import { useState } from "react";
import { createVendorAction, createCustomerAction } from "@/app/actions";
import { X } from "lucide-react";

export function PartnerModal({ type, onClose }: { type: 'VENDOR' | 'CUSTOMER', onClose: () => void }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        if (type === 'VENDOR') {
            await createVendorAction({ name, email, phone, address });
        } else {
            await createCustomerAction({ name, email, phone, address });
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">Add {type === 'VENDOR' ? 'Supplier' : 'Buyer'}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Name</label>
                        <input value={name} onChange={e => setName(e.target.value)} className="w-full p-2 bg-background border rounded-md" required />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Email</label>
                        <input value={email} onChange={e => setEmail(e.target.value)} type="email" className="w-full p-2 bg-background border rounded-md" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Phone</label>
                        <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2 bg-background border rounded-md" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Address</label>
                        <textarea value={address} onChange={e => setAddress(e.target.value)} className="w-full p-2 bg-background border rounded-md h-24" />
                    </div>

                    <div className="pt-4 border-t flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md hover:bg-muted">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">Add Partner</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
