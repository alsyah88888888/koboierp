"use client";

import { useState } from "react";
import { createPurchaseOrderAction } from "@/app/actions";
import { Plus, Trash2, X } from "lucide-react";

interface Product {
    id: string;
    sku: string;
    name: string;
}

interface Vendor {
    id: string;
    name: string;
}

export function CreatePOModal({ vendors, products, onClose }: { vendors: Vendor[], products: Product[], onClose: () => void }) {
    const [number, setNumber] = useState(`PO-${Date.now().toString().slice(-6)}`);
    const [vendorId, setVendorId] = useState("");
    const [items, setItems] = useState([{ productId: "", quantity: 1, price: 0 }]);

    const addItem = () => setItems([...items, { productId: "", quantity: 1, price: 0 }]);
    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        (newItems[index] as any)[field] = value;
        setItems(newItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!vendorId || items.some(i => !i.productId)) return;

        await createPurchaseOrderAction({ number, vendorId, items });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">Create Purchase Order</h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">PO Number</label>
                            <input
                                value={number}
                                onChange={e => setNumber(e.target.value)}
                                className="w-full p-2 bg-background border rounded-md"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Vendor</label>
                            <select
                                value={vendorId}
                                onChange={e => setVendorId(e.target.value)}
                                className="w-full p-2 bg-background border rounded-md"
                                required
                            >
                                <option value="">Select Vendor</option>
                                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold text-primary">Items</h3>
                            <button
                                type="button"
                                onClick={addItem}
                                className="text-sm flex items-center gap-1 text-primary hover:underline"
                            >
                                <Plus className="h-4 w-4" /> Add Item
                            </button>
                        </div>

                        <div className="space-y-3">
                            {items.map((item, index) => (
                                <div key={index} className="grid grid-cols-12 gap-3 items-end border p-3 rounded-lg bg-muted/20">
                                    <div className="col-span-6 space-y-1">
                                        <label className="text-[10px] uppercase text-muted-foreground">Product</label>
                                        <select
                                            value={item.productId}
                                            onChange={e => updateItem(index, 'productId', e.target.value)}
                                            className="w-full p-2 bg-background border rounded-md text-sm"
                                            required
                                        >
                                            <option value="">Select Product</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                        <label className="text-[10px] uppercase text-muted-foreground">Qty</label>
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={e => updateItem(index, 'quantity', parseInt(e.target.value))}
                                            className="w-full p-2 bg-background border rounded-md text-sm"
                                            min="1"
                                            required
                                        />
                                    </div>
                                    <div className="col-span-3 space-y-1">
                                        <label className="text-[10px] uppercase text-muted-foreground">Price</label>
                                        <input
                                            type="number"
                                            value={item.price}
                                            onChange={e => updateItem(index, 'price', parseFloat(e.target.value))}
                                            className="w-full p-2 bg-background border rounded-md text-sm"
                                            min="0"
                                            required
                                        />
                                    </div>
                                    <div className="col-span-1 pb-1">
                                        <button
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            className="p-2 text-destructive hover:bg-destructive/10 rounded-md"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 border-t flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md hover:bg-muted">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">Create PO</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
