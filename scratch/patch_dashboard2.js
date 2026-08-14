const fs = require('fs');
let code = fs.readFileSync('src/app/reports/ReportsDashboard.tsx', 'utf8');

const arusKasSection = `
                        <div className="h-6" />
                        <div className="pt-4 border-t border-slate-200 border-dashed">
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-2">ARUS KAS OPERASIONAL (Cash Flow)</h4>
                            <PLRow label="TOTAL UANG KELUAR BSH" value={pl.cashFlowExpenses || 0} bold negative isClient={isClient} />
                            {(pl.cashFlowByCategory || []).map((cat: any, i: number) => (
                                <PLRow key={i} label={\`  \${cat.name}\`} value={cat.value} sub isClient={isClient} />
                            ))}
                        </div>
`;

code = code.replace(
    /(<PLRow label="Margin".*\/>\n\s*<\/div>\n\s*<\/div>)/g,
    `$1${arusKasSection}`
);

// We need to fix the replace logic because the div closing might be different. Let's do it safely.
code = code.replace(
    /<PLRow label="Margin" value=\{pl.netProfit\} bold highlight=\{pl.netProfit >= 0 \? 'green' : 'red'\} isClient=\{isClient\} \/>/g,
    `<PLRow label="Margin (P&L)" value={pl.netProfit} bold highlight={pl.netProfit >= 0 ? 'green' : 'red'} isClient={isClient} />
                        
                        {pl.cashFlowByCategory && pl.cashFlowByCategory.length > 0 && (
                            <>
                                <div className="h-6" />
                                <div className="pt-4 border-t border-slate-200 border-dashed">
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Rekonsiliasi Arus Kas Operasional</h4>
                                    <PLRow label="Total Uang Keluar (Detail Operasional)" value={pl.cashFlowExpenses || 0} bold negative isClient={isClient} />
                                    {(pl.cashFlowByCategory || []).map((cat: any, i: number) => (
                                        <PLRow key={'cf'+i} label={\`  \${cat.name}\`} value={cat.value} sub isClient={isClient} />
                                    ))}
                                </div>
                            </>
                        )}`
);

fs.writeFileSync('src/app/reports/ReportsDashboard.tsx', code);
