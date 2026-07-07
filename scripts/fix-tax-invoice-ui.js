const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Add state variables
  const stateSearch = /const \[invoiceNumber, setInvoiceNumber\] = useState\(""\);/g;
  const stateReplace = `const [invoiceNumber, setInvoiceNumber] = useState("");\n    const [taxInvoiceNumber, setTaxInvoiceNumber] = useState(initialData?.taxInvoiceNumber || "");\n    const [taxInvoiceDate, setTaxInvoiceDate] = useState(initialData?.taxInvoiceDate ? new Date(initialData.taxInvoiceDate).toISOString().split('T')[0] : "");`;
  content = content.replace(stateSearch, stateReplace);

  // 2. Add to payload
  const payloadSearch = /invoiceNumber,\n\s*warehouseId/g;
  const payloadReplace = `invoiceNumber,\n            taxInvoiceNumber: taxInvoiceNumber || undefined,\n            taxInvoiceDate: taxInvoiceDate || undefined,\n            warehouseId`;
  content = content.replace(payloadSearch, payloadReplace);

  // 3. Add to UI
  const uiSearch = /<div className="space-y-1">\n\s*<label className="text-\[10px\] font-black uppercase tracking-widest text-slate-400 ml-1">No. Kendaraan<\/label>/g;
  const uiReplace = `<div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">No. Faktur Pajak</label>
                                    <input value={taxInvoiceNumber} onChange={e => setTaxInvoiceNumber(e.target.value)} className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-bold focus:border-primary outline-none transition-all" placeholder="Opsi..." />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tgl Faktur Pajak</label>
                                    <input type="date" value={taxInvoiceDate} onChange={e => setTaxInvoiceDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-bold focus:border-primary outline-none transition-all" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">No. Kendaraan</label>`;
  
  content = content.replace(uiSearch, uiReplace);

  // Since we added 2 columns, we might need to adjust grid-cols from 5 to 7 or just let it wrap.
  const gridSearch = /className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3"/g;
  const gridReplace = `className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-3"`;
  content = content.replace(gridSearch, gridReplace);

  fs.writeFileSync(filePath, content);
  console.log(`Updated Tax Invoice UI in ${filePath}`);
}

fixFile('src/app/sales/SalesModal.tsx');
