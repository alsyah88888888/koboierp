const fs = require('fs');

function patchSalesInvoice(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace map and length
    content = content.replace(/\{delivery\.items\.map/g, '{groupedItems.map');
    content = content.replace(/delivery\.items\.length/g, 'groupedItems.length');

    // Insert grouped items logic right after if (!delivery) return ...
    const searchRegex = /if \(!delivery\) return <div>Data.*<\/div>;/;
    const insertStr = `
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
        content = content.replace(searchRegex, (match) => match + '\n' + insertStr);
    }
    
    // Replace the reduce over delivery.items with groupedItems
    content = content.replace(/const totalQty = delivery\.items\.reduce.*/, 'const totalQty = groupedItems.reduce((acc: number, item: any) => acc + (Number(item.quantity) || 0), 0);');

    // Add tfoot for total qty
    const tfoot = `                </tbody>
                <tfoot>
                    <tr className="bg-slate-50 font-black text-[9px]">
                        <td colSpan={3} className="border border-slate-900 p-1.5 text-right uppercase tracking-widest">TOTAL QTY KESELURUHAN:</td>
                        <td className="border border-slate-900 p-1.5 text-center">{formatNumber(totalQty)}</td>
                        <td colSpan={3} className="border border-slate-900"></td>
                    </tr>
                </tfoot>
            </table>`;
            
    if (!content.includes('<tfoot>')) {
        content = content.replace(/<\/tbody>\s*<\/table>/, tfoot);
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Patched Sales Invoice', filePath);
}

function patchSalesOrder(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    content = content.replace(/\{order\.items\.map/g, '{groupedItems.map');
    content = content.replace(/order\.items\.length/g, 'groupedItems.length');

    const searchRegex = /if \(!order\) return <div className="p-10 text-center font-black">ORDER NOT FOUND<\/div>;/;
    const insertStr = `
    const groupedItemsMap = order.items.reduce((acc: any, item: any) => {
        const key = item.productId || item.product?.id || item.product?.name;
        if (!acc[key]) {
            acc[key] = { 
                ...item, 
                quantity: Number(item.quantity),
                shippedQuantity: Number(item.shippedQuantity || 0)
            };
        } else {
            acc[key].quantity += Number(item.quantity);
            acc[key].shippedQuantity += Number(item.shippedQuantity || 0);
        }
        return acc;
    }, {});
    const groupedItems = Object.values(groupedItemsMap) as any[];`;

    if (!content.includes('groupedItemsMap')) {
        content = content.replace(searchRegex, (match) => match + '\n' + insertStr);
    }

    content = content.replace(/const totalQty = order\.items\.reduce.*/, 'const totalQty = groupedItems.reduce((acc: number, item: any) => acc + (Number(item.quantity) || 0), 0);');

    // Add tfoot
    const tfoot = `                </tbody>
                <tfoot>
                    <tr className="bg-slate-50 font-black text-[9px]">
                        <td colSpan={2} className="border border-slate-900 p-1.5 text-right uppercase tracking-widest">TOTAL QTY KESELURUHAN:</td>
                        <td className="border border-slate-900 p-1.5 text-center">{formatNumber(totalQty)}</td>
                        <td colSpan={3} className="border border-slate-900"></td>
                    </tr>
                </tfoot>
            </table>`;

    if (!content.includes('<tfoot>')) {
        content = content.replace(/<\/tbody>\s*<\/table>/, tfoot);
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Patched Sales Order', filePath);
}

patchSalesInvoice('src/app/sales/print/[id]/page.tsx');
patchSalesOrder('src/app/sales/order/print/[id]/page.tsx');
