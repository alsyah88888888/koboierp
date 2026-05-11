const fs = require('fs');

function addFooter(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if tfoot already exists
    if (!content.includes('<tfoot>')) {
        const tfoot = `                </tbody>
                <tfoot>
                    <tr className="bg-slate-50 font-black text-[10px] text-slate-900">
                        <td colSpan={3} className="border border-slate-900 p-2.5 text-right uppercase tracking-widest">TOTAL QTY KESELURUHAN:</td>
                        <td className="border border-slate-900 p-2.5 text-center">{formatNumber(totalQty)}</td>
                        <td colSpan={3} className="border border-slate-900"></td>
                    </tr>
                </tfoot>
            </table>`;
        content = content.replace(/<\/tbody>\s*<\/table>/, tfoot);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Added footer to', filePath);
    } else {
        console.log('Footer already exists in', filePath);
    }
}

addFooter('src/app/purchase/print/invoice/[id]/page.tsx');
addFooter('src/app/purchase/print/[id]/page.tsx');
