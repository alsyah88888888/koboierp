const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Add state
  const stateInsert = /const \[editBankId, setEditBankId\] = useState\(""\);/g;
  const stateCode = `const [editBankId, setEditBankId] = useState("");
    const [transferModal, setTransferModal] = useState(false);
    const [transferFrom, setTransferFrom] = useState("");
    const [transferTo, setTransferTo] = useState("");
    const [transferAmount, setTransferAmount] = useState("");
    const [transferDate, setTransferDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [transferDesc, setTransferDesc] = useState("");

    const handleTransferSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!transferFrom || !transferTo || !transferAmount || !transferDate || !transferDesc) return alert("Semua kolom harus diisi.");
        if (transferFrom === transferTo) return alert("Rekening asal dan tujuan tidak boleh sama.");
        
        const rawAmount = parseInt(transferAmount.replace(/\\D/g, ""), 10);
        if (rawAmount <= 0) return alert("Jumlah harus lebih dari 0.");

        setLoading("transfer");
        try {
            await callAction("transferFund", transferFrom, transferTo, rawAmount, transferDesc, new Date(transferDate));
            alert("Transfer dana berhasil dicatat.");
            setTransferModal(false);
            setTransferFrom(""); setTransferTo(""); setTransferAmount(""); setTransferDesc("");
            router.refresh();
        } catch (error: any) {
            alert(error?.message || "Gagal mencatat transfer dana.");
        } finally {
            setLoading(null);
        }
    };\n`;
  content = content.replace(stateInsert, stateCode);

  // 2. Add Button next to "Catat Transaksi"
  const buttonInsert = /<button onClick=\{\(\) => setShowModal\(true\)\} className="px-5 py-2.5 bg-slate-900 text-white text-\[10px\] font-black rounded-xl hover:bg-slate-800 transition-all uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-slate-900\/20 whitespace-nowrap">/g;
  const buttonCode = `<button onClick={() => setTransferModal(true)} className="px-5 py-2.5 bg-blue-600 text-white text-[10px] font-black rounded-xl hover:bg-blue-700 transition-all uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-600/20 whitespace-nowrap">
                                <ArrowRightLeft className="h-4 w-4" /> Transfer Dana
                            </button>
                            <button onClick={() => setShowModal(true)} className="px-5 py-2.5 bg-slate-900 text-white text-[10px] font-black rounded-xl hover:bg-slate-800 transition-all uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-slate-900/20 whitespace-nowrap">`;
  content = content.replace(buttonInsert, buttonCode);

  // 3. Add Modal UI at the end
  const modalInsert = /\{showModal && \(/g;
  const modalCode = `{transferModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                                <ArrowRightLeft className="h-6 w-6 text-blue-600" />
                                Transfer Dana
                            </h2>
                            <button onClick={() => setTransferModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleTransferSubmit} className="p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dari Akun</label>
                                    <select value={transferFrom} onChange={e => setTransferFrom(e.target.value)} required className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold focus:border-blue-500 outline-none">
                                        <option value="">Pilih Asal...</option>
                                        {accounts.filter(a => ["101", "102"].includes(a.code)).map(a => (
                                            <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ke Akun</label>
                                    <select value={transferTo} onChange={e => setTransferTo(e.target.value)} required className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold focus:border-blue-500 outline-none">
                                        <option value="">Pilih Tujuan...</option>
                                        {accounts.filter(a => ["101", "102"].includes(a.code)).map(a => (
                                            <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tanggal</label>
                                <input type="date" value={transferDate} onChange={e => setTransferDate(e.target.value)} required className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold focus:border-blue-500 outline-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Jumlah (Rp)</label>
                                <input type="text" value={transferAmount} onChange={e => {
                                    const val = e.target.value.replace(/\\D/g, "");
                                    setTransferAmount(val ? "Rp " + parseInt(val, 10).toLocaleString('id-ID') : "");
                                }} required placeholder="Rp 0" className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-lg font-black focus:border-blue-500 outline-none tabular-nums" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Keterangan</label>
                                <input type="text" value={transferDesc} onChange={e => setTransferDesc(e.target.value)} required placeholder="Misal: Setor tunai ke BCA..." className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold focus:border-blue-500 outline-none" />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setTransferModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 text-xs font-black rounded-xl uppercase tracking-widest hover:bg-slate-200">Batal</button>
                                <button type="submit" disabled={loading === "transfer"} className="flex-1 py-3 bg-blue-600 text-white text-xs font-black rounded-xl uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50">
                                    {loading === "transfer" ? "Memproses..." : "Proses Transfer"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {showModal && (`

  content = content.replace(modalInsert, modalCode);
  fs.writeFileSync(filePath, content);
  console.log(`Added Transfer Modal to FinanceDashboard.tsx`);
}

fixFile('src/app/finance/FinanceDashboard.tsx');
