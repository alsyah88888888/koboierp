const fs = require('fs');
let content = fs.readFileSync('src/app/purchase/PurchaseRequestModal.tsx', 'utf8');

const targetState = `    const [items, setItems] = useState<RequestItem[]>(`;

const replaceState = `    const [salesRefs, setSalesRefs] = useState<any[]>([]);
    const [purchaseRefs, setPurchaseRefs] = useState<any[]>([]);
    const [isSalesDropdownOpen, setIsSalesDropdownOpen] = useState(false);
    const [isPurchaseDropdownOpen, setIsPurchaseDropdownOpen] = useState(false);
    const [salesSearch, setSalesSearch] = useState("");
    const [purchaseSearch, setPurchaseSearch] = useState("");

    // Fetch refs on mount
    import("react").then(({ useEffect }) => {
        useEffect(() => {
            const loadRefs = async () => {
                try {
                    const sRes = await callAction("getRecentSalesReferences");
                    if (Array.isArray(sRes)) setSalesRefs(sRes);
                    const pRes = await callAction("getRecentPurchaseReferences");
                    if (Array.isArray(pRes)) setPurchaseRefs(pRes);
                } catch (err) {
                    console.error("Error loading refs:", err);
                }
            };
            loadRefs();
        }, []);
    });

    const filteredSalesRefs = salesRefs.filter(r => 
        (r.invoiceNumber || "").toLowerCase().includes(salesSearch.toLowerCase()) || 
        (r.buyerName || "").toLowerCase().includes(salesSearch.toLowerCase())
    ).slice(0, 50);

    const filteredPurchaseRefs = purchaseRefs.filter(r => 
        (r.receiptNumber || "").toLowerCase().includes(purchaseSearch.toLowerCase()) || 
        (r.supplierName || "").toLowerCase().includes(purchaseSearch.toLowerCase())
    ).slice(0, 50);

    const [items, setItems] = useState<RequestItem[]>(`;

content = content.replace(targetState, replaceState);

const targetSalesUI = `                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400">No. Penjualan / Invoice (Opsional)</label>
                                <input
                                    type="text"
                                    placeholder="Cth: KB-TRD-01062026-004"
                                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                                    value={invoiceNumber}
                                    onChange={(e) => setInvoiceNumber(e.target.value)}
                                />
                            </div>`;

const replaceSalesUI = `                            <div className="space-y-2 relative">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400">No. Penjualan / Invoice (Opsional)</label>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setIsSalesDropdownOpen(!isSalesDropdownOpen)}
                                        className="w-full text-left bg-slate-50 border-2 border-slate-100 rounded-xl p-4 text-sm focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all flex justify-between items-center cursor-pointer min-h-[56px]"
                                    >
                                        <span className="truncate">
                                            {invoiceNumber || "Cari No. Penjualan / SJ..."}
                                        </span>
                                        <span className="text-[10px] text-slate-400">▼</span>
                                    </button>

                                    {isSalesDropdownOpen && (
                                        <>
                                            <div 
                                                className="fixed inset-0 z-40 cursor-default" 
                                                onClick={() => setIsSalesDropdownOpen(false)}
                                            />
                                            <div className="absolute right-0 left-0 mt-1 bg-white border-2 border-slate-200 shadow-2xl rounded-2xl p-2 z-50 max-h-60 overflow-y-auto space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                                                <input
                                                    type="text"
                                                    placeholder="Cari Invoice/Customer..."
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-lg py-2 px-3 text-sm font-semibold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                                    value={salesSearch}
                                                    onChange={(e) => setSalesSearch(e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <div className="space-y-1 max-h-48 overflow-y-auto">
                                                    {filteredSalesRefs.length === 0 ? (
                                                        <div className="p-3 text-[10px] font-bold text-slate-400 text-center uppercase tracking-wider">
                                                            Data tidak ditemukan
                                                        </div>
                                                    ) : (
                                                        filteredSalesRefs.map((ref) => (
                                                            <button
                                                                key={ref.invoiceNumber}
                                                                type="button"
                                                                onClick={() => {
                                                                    setInvoiceNumber(ref.invoiceNumber);
                                                                    setSalesPerson(ref.salesPerson || salesPerson);
                                                                    setIsSalesDropdownOpen(false);
                                                                    setSalesSearch("");
                                                                }}
                                                                className="w-full text-left p-3 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer flex flex-col gap-1 border border-transparent hover:border-slate-100"
                                                            >
                                                                <span className="text-sm font-bold text-slate-800 tracking-tight">
                                                                    {ref.invoiceNumber}
                                                                </span>
                                                                <span className="text-xs font-medium text-slate-500 leading-none">
                                                                    {ref.buyerName || "No Customer"} • Sales: {ref.salesPerson || "No Sales"}
                                                                </span>
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>`;

content = content.replace(targetSalesUI, replaceSalesUI);

const targetPurchaseUI = `                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400">No. LPB / Pembelian (Opsional)</label>
                                <input
                                    type="text"
                                    placeholder="Cth: KB-LPBD-02062026-005"
                                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                                    value={receiptNumber}
                                    onChange={(e) => setReceiptNumber(e.target.value)}
                                />
                            </div>`;

const replacePurchaseUI = `                            <div className="space-y-2 relative">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400">No. LPB / Pembelian (Opsional)</label>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setIsPurchaseDropdownOpen(!isPurchaseDropdownOpen)}
                                        className="w-full text-left bg-slate-50 border-2 border-slate-100 rounded-xl p-4 text-sm focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all flex justify-between items-center cursor-pointer min-h-[56px]"
                                    >
                                        <span className="truncate">
                                            {receiptNumber || "Cari No. LPB..."}
                                        </span>
                                        <span className="text-[10px] text-slate-400">▼</span>
                                    </button>

                                    {isPurchaseDropdownOpen && (
                                        <>
                                            <div 
                                                className="fixed inset-0 z-40 cursor-default" 
                                                onClick={() => setIsPurchaseDropdownOpen(false)}
                                            />
                                            <div className="absolute right-0 left-0 mt-1 bg-white border-2 border-slate-200 shadow-2xl rounded-2xl p-2 z-50 max-h-60 overflow-y-auto space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                                                <input
                                                    type="text"
                                                    placeholder="Cari LPB/Supplier..."
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-lg py-2 px-3 text-sm font-semibold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                                    value={purchaseSearch}
                                                    onChange={(e) => setPurchaseSearch(e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <div className="space-y-1 max-h-48 overflow-y-auto">
                                                    {filteredPurchaseRefs.length === 0 ? (
                                                        <div className="p-3 text-[10px] font-bold text-slate-400 text-center uppercase tracking-wider">
                                                            Data tidak ditemukan
                                                        </div>
                                                    ) : (
                                                        filteredPurchaseRefs.map((ref) => (
                                                            <button
                                                                key={ref.receiptNumber}
                                                                type="button"
                                                                onClick={() => {
                                                                    setReceiptNumber(ref.receiptNumber);
                                                                    setIsPurchaseDropdownOpen(false);
                                                                    setPurchaseSearch("");
                                                                }}
                                                                className="w-full text-left p-3 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer flex flex-col gap-1 border border-transparent hover:border-slate-100"
                                                            >
                                                                <span className="text-sm font-bold text-slate-800 tracking-tight">
                                                                    {ref.receiptNumber}
                                                                </span>
                                                                <span className="text-xs font-medium text-slate-500 leading-none">
                                                                    {ref.supplierName || "No Supplier"} • {ref.date ? new Date(ref.date).toLocaleDateString('id-ID') : ""}
                                                                </span>
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>`;

content = content.replace(targetPurchaseUI, replacePurchaseUI);
fs.writeFileSync('src/app/purchase/PurchaseRequestModal.tsx', content);
console.log("Updated PR modal with dropdown");
