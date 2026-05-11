const fs = require('fs');

function patchInvoice(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Insert grouped items logic right after if (!receipt) return <div>Data not found</div>;
    const searchStr1 = `if (!receipt) return <div>Data not found</div>;`;
    const insertStr1 = `
    const groupedItemsMap = receipt.items.reduce((acc: any, item: any) => {
        const key = item.productId || item.product?.id || item.product?.name;
        if (!acc[key]) {
            acc[key] = { ...item, quantity: Number(item.quantity) };
        } else {
            acc[key].quantity += Number(item.quantity);
        }
        return acc;
    }, {});
    const groupedItems = Object.values(groupedItemsMap) as any[];`;
    
    if (content.includes(searchStr1) && !content.includes('groupedItemsMap')) {
        content = content.replace(searchStr1, searchStr1 + '\n' + insertStr1);
    }

    // Replace receipt.items.map with groupedItems.map
    content = content.replace(/\{receipt\.items\.map/g, '{groupedItems.map');
    
    // Replace receipt.items.length with groupedItems.length in the Math.max padding
    content = content.replace(/receipt\.items\.length/g, 'groupedItems.length');

    // Make sure we have a totalQty in the file if we want to display it.
    // In `invoice/[id]/page.tsx`, `totalQty` is defined:
    // const totalQty = receipt.items.reduce((acc: number, item: any) => acc + (Number(item.quantity) || 0), 0);
    // In `purchase/print/[id]/page.tsx`, it's not defined, so let's define it.
    if (!content.includes('const totalQty')) {
        const totalQtyStr = `\n    const totalQty = groupedItems.reduce((acc: number, item: any) => acc + item.quantity, 0);`;
        content = content.replace('const subTotal = Number(receipt.subtotal || 0);', totalQtyStr + '\n    const subTotal = Number(receipt.subtotal || 0);');
    }

    // Add tfoot for total qty in purchase invoices
    // invoice/[id]/page.tsx has `</table>` right after `</tbody>`
    // Wait, the table structure: 
    //                 </tbody>
    //             </table>
    const tfoot = `
                <tfoot>
                    <tr className="bg-slate-50 font-black text-[10px] text-slate-900">
                        <td colSpan={3} className="border border-slate-900 p-2.5 text-right uppercase tracking-widest">TOTAL QTY:</td>
                        <td className="border border-slate-900 p-2.5 text-center">{formatNumber(totalQty)}</td>
                        <td colSpan={3} className="border border-slate-900"></td>
                    </tr>
                </tfoot>`;
    
    if (!content.includes('<tfoot>') && content.includes('</tbody>')) {
        content = content.replace('                </tbody>\n            </table>', '                </tbody>' + tfoot + '\n            </table>');
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Patched', filePath);
}

function patchSuratJalan(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    const searchStr1 = `if (!delivery) return <div>Data`; // to handle <div>Data not found</div> or <div>Data tidak ditemukan</div>
    const searchRegex1 = /if \(!delivery\) return <div>Data.*<\/div>;/;
    const insertStr1 = `
    const groupedItemsMap = delivery.items.reduce((acc: any, item: any) => {
        const key = item.productId || item.product?.id || item.product?.name;
        if (!acc[key]) {
            acc[key] = { ...item, quantity: Number(item.quantity) };
        } else {
            acc[key].quantity += Number(item.quantity);
        }
        return acc;
    }, {});
    const groupedItems = Object.values(groupedItemsMap) as any[];`;

    if (!content.includes('groupedItemsMap')) {
        content = content.replace(searchRegex1, (match) => match + '\n' + insertStr1);
    }

    content = content.replace(/\{delivery\.items\.map/g, '{groupedItems.map');
    content = content.replace(/delivery\.items\.length/g, 'groupedItems.length');

    // update the total qty reduce call in tfoot
    content = content.replace(/delivery\.items\.reduce\(\(acc: number, i: any\) => acc \+ \(Number\(i\.quantity\) \|\| 0\), 0\)/g, 'groupedItems.reduce((acc: number, i: any) => acc + (Number(i.quantity) || 0), 0)');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Patched', filePath);
}

patchInvoice('src/app/purchase/print/invoice/[id]/page.tsx');
patchInvoice('src/app/purchase/print/[id]/page.tsx');

patchSuratJalan('src/app/sales/print/sj/[id]/page.tsx');
patchSuratJalan('src/app/sales/print/sj-dot/[id]/page.tsx');
