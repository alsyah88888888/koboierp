const fs = require('fs');
let content = fs.readFileSync('src/app/purchase/PurchaseRequestModal.tsx', 'utf8');

const targetState = `    const [formData, setFormData] = useState<{
        notes: string;
        category: string;
        salesPerson: string;
        items: { id?: string; itemName: string; quantity: number; estimatedPrice: string }[];
    }>({
        notes: "",
        category: "PEMBELIAN",
        salesPerson: "",
        items: [{ itemName: "", quantity: 1, estimatedPrice: "" }]
    });`;

const replaceState = `    const [formData, setFormData] = useState<{
        notes: string;
        category: string;
        salesPerson: string;
        invoiceNumber: string;
        receiptNumber: string;
        items: { id?: string; itemName: string; quantity: number; estimatedPrice: string }[];
    }>({
        notes: "",
        category: "PEMBELIAN",
        salesPerson: "",
        invoiceNumber: "",
        receiptNumber: "",
        items: [{ itemName: "", quantity: 1, estimatedPrice: "" }]
    });`;

content = content.replace(targetState, replaceState);

const targetEffect = `                category: initialPr.category || "PEMBELIAN",
                salesPerson: initialPr.salesPerson || "",
                items: initialPr.items.map((i: any) => ({`;

const replaceEffect = `                category: initialPr.category || "PEMBELIAN",
                salesPerson: initialPr.salesPerson || "",
                invoiceNumber: initialPr.invoiceNumber || "",
                receiptNumber: initialPr.receiptNumber || "",
                items: initialPr.items.map((i: any) => ({`;

content = content.replace(targetEffect, replaceEffect);

const targetForm = `                            {formData.category === "OPERASIONAL" && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nama Sales (Opsional)</label>
                                    <select
                                        className="w-full bg-accent/50 border-none rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                                        value={formData.salesPerson}
                                        onChange={(e) => setFormData({ ...formData, salesPerson: e.target.value })}
                                    >
                                        <option value="">-- Pilih Sales --</option>
                                        <option value="BC">Sales BC</option>
                                        <option value="PF">Sales PF</option>
                                    </select>
                                </div>
                            )}`;

const replaceForm = `                            {formData.category === "OPERASIONAL" && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nama Sales (Opsional)</label>
                                        <select
                                            className="w-full bg-accent/50 border-none rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                                            value={formData.salesPerson}
                                            onChange={(e) => setFormData({ ...formData, salesPerson: e.target.value })}
                                        >
                                            <option value="">-- Pilih Sales --</option>
                                            <option value="BC">Sales BC</option>
                                            <option value="PF">Sales PF</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">No. Penjualan / Invoice (Opsional)</label>
                                        <input
                                            type="text"
                                            placeholder="Cth: KB-TRD-01062026-004"
                                            className="w-full bg-accent/50 border-none rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                                            value={formData.invoiceNumber}
                                            onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">No. LPB / Pembelian (Opsional)</label>
                                        <input
                                            type="text"
                                            placeholder="Cth: KB-LPBD-02062026-005"
                                            className="w-full bg-accent/50 border-none rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                                            value={formData.receiptNumber}
                                            onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-span-full">
                                        <p className="text-[10px] font-medium text-emerald-600 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                                            💡 Info: Jika No. Penjualan atau LPB diisi, maka biaya pengajuan ini akan otomatis memotong margin barang di menu Traceability sebagai biaya "Ops".
                                        </p>
                                    </div>
                                </>
                            )}`;

content = content.replace(targetForm, replaceForm);

const targetSubmit = `            const payload = {
                notes: formData.notes,
                category: formData.category,
                salesPerson: formData.salesPerson,
                items: formData.items.map(i => ({`;

const replaceSubmit = `            const payload = {
                notes: formData.notes,
                category: formData.category,
                salesPerson: formData.salesPerson,
                invoiceNumber: formData.invoiceNumber || undefined,
                receiptNumber: formData.receiptNumber || undefined,
                items: formData.items.map(i => ({`;

content = content.replace(targetSubmit, replaceSubmit);

fs.writeFileSync('src/app/purchase/PurchaseRequestModal.tsx', content);
console.log("Updated PR modal");
