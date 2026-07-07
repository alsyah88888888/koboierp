const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Find where it renders "No Invoice:" and add Tax Invoice fields
  const uiSearch = /<div className="flex">\n\s*<div className="w-24 text-slate-500 font-medium">Date<\/div>/g;
  const uiReplace = `<div className="flex">
                            <div className="w-24 text-slate-500 font-medium">No. Seri FP</div>
                            <div className="flex-1 font-semibold">: {delivery.taxInvoiceNumber || "-"}</div>
                        </div>
                        <div className="flex">
                            <div className="w-24 text-slate-500 font-medium">Tgl Faktur Pajak</div>
                            <div className="flex-1 font-semibold">: {delivery.taxInvoiceDate ? format(new Date(delivery.taxInvoiceDate), "dd MMM yyyy") : "-"}</div>
                        </div>
                        <div className="flex">
                            <div className="w-24 text-slate-500 font-medium">Date</div>`;
  
  content = content.replace(uiSearch, uiReplace);

  fs.writeFileSync(filePath, content);
  console.log(`Updated Tax Invoice Print UI in ${filePath}`);
}

fixFile('src/app/sales/print/[id]/page.tsx');
