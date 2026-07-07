const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix Invoice Dropdown Logic
  const invoiceSearch = /onClick=\{\(\) => \{\n\s*setInvoiceNumber\(ref\.invoiceNumber\);\n\s*setSalesPerson\(ref\.salesPerson \|\| salesPerson\);\n\s*setIsSalesDropdownOpen\(false\);\n\s*setSalesSearch\(""\);\n\s*\}\}\n\s*className="w-full text-left p-3 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer flex flex-col gap-1 border border-transparent hover:border-slate-100"/g;
  
  const invoiceReplacement = `onClick={() => {
                                                                    const currentInvoices = invoiceNumber ? invoiceNumber.split(',').map(s => s.trim()) : [];
                                                                    if (currentInvoices.includes(ref.invoiceNumber)) {
                                                                        const newInvoices = currentInvoices.filter(r => r !== ref.invoiceNumber);
                                                                        setInvoiceNumber(newInvoices.join(', '));
                                                                    } else {
                                                                        currentInvoices.push(ref.invoiceNumber);
                                                                        setInvoiceNumber(currentInvoices.join(', '));
                                                                        setSalesPerson(ref.salesPerson || salesPerson);
                                                                    }
                                                                    // Keep dropdown open for multiple selections
                                                                }}
                                                                className={\`w-full text-left p-3 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer flex flex-col gap-1 border \${(invoiceNumber || '').includes(ref.invoiceNumber) ? 'bg-primary/5 border-primary shadow-sm' : 'border-transparent hover:border-slate-100'}\`}`;

  content = content.replace(invoiceSearch, invoiceReplacement);

  // Fix Receipt Dropdown Logic
  const receiptSearch = /onClick=\{\(\) => \{\n\s*setReceiptNumber\(ref\.receiptNumber\);\n\s*setIsPurchaseDropdownOpen\(false\);\n\s*setPurchaseSearch\(""\);\n\s*\}\}\n\s*className="w-full text-left p-3 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer flex flex-col gap-1 border border-transparent hover:border-slate-100"/g;

  const receiptReplacement = `onClick={() => {
                                                                    const currentReceipts = receiptNumber ? receiptNumber.split(',').map(s => s.trim()) : [];
                                                                    if (currentReceipts.includes(ref.receiptNumber)) {
                                                                        const newReceipts = currentReceipts.filter(r => r !== ref.receiptNumber);
                                                                        setReceiptNumber(newReceipts.join(', '));
                                                                    } else {
                                                                        currentReceipts.push(ref.receiptNumber);
                                                                        setReceiptNumber(currentReceipts.join(', '));
                                                                    }
                                                                    // Keep dropdown open for multiple selections
                                                                }}
                                                                className={\`w-full text-left p-3 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer flex flex-col gap-1 border \${(receiptNumber || '').includes(ref.receiptNumber) ? 'bg-emerald-50 border-emerald-400 shadow-sm' : 'border-transparent hover:border-slate-100'}\`}`;

  content = content.replace(receiptSearch, receiptReplacement);

  // Add "Selesai" button for both dropdowns
  const invoiceSelesaiSearch = /<div className="space-y-1 max-h-48 overflow-y-auto">/g;
  const invoiceSelesaiReplacement = `<div className="flex justify-between items-center px-1 mb-1">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bisa pilih lebih dari satu</span>
                                                    <button type="button" onClick={() => {setIsSalesDropdownOpen(false); setIsPurchaseDropdownOpen(false);}} className="text-xs font-bold text-primary hover:text-primary/80">Tutup</button>
                                                </div>\n                                                <div className="space-y-1 max-h-48 overflow-y-auto">`;

  content = content.replace(invoiceSelesaiSearch, invoiceSelesaiReplacement);

  fs.writeFileSync(filePath, content);
  console.log(`Updated Multi-Select logic in ${filePath}`);
}

fixFile('src/app/purchase/PurchaseRequestModal.tsx');
