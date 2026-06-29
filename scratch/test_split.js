function testSplit() {
    const amt = 441000;
    const invoices = ['KB-TRN-29052026-006', 'KB-TRN-29052026-003'];
    
    // Qty from screenshot:
    // -006: 70 + 145 + 65 + 6 + 69 = 355
    // -003: 5 + 195 = 200
    // Total = 555
    
    const qtyMap = new Map();
    qtyMap.set('KB-TRN-29052026-006', 355);
    qtyMap.set('KB-TRN-29052026-003', 200);
    
    const totalQty = 555;
    const opsMap = new Map();
    
    let remainingAmt = amt;
    let remainingQty = totalQty;
    
    invoices.forEach((inv, index) => {
        const qty = qtyMap.get(inv) || 1;
        const splitAmt = remainingQty > 0 ? Math.round(remainingAmt * (qty / remainingQty)) : Math.round(remainingAmt / (invoices.length - index));
        remainingAmt -= splitAmt;
        remainingQty -= qty;
        opsMap.set(inv, (opsMap.get(inv) || 0) + splitAmt);
    });
    
    console.log("Ops Map after invoice split:");
    console.log(opsMap);
    
    // Now split inside -006 (qty 355, ops = opsMap.get('-006'))
    let remainingInvoiceOps1 = opsMap.get('KB-TRN-29052026-006');
    let remainingSdQty1 = 355;
    const items1 = [70, 145, 65, 6, 69];
    let totalOps1 = 0;
    
    console.log("Split for -006:");
    items1.forEach(qty => {
        const rowOps = remainingSdQty1 > 0 ? Math.round(remainingInvoiceOps1 * (qty / remainingSdQty1)) : 0;
        remainingInvoiceOps1 -= rowOps;
        remainingSdQty1 -= qty;
        console.log(`Qty: ${qty}, Ops: ${rowOps}`);
        totalOps1 += rowOps;
    });
    console.log("Total Ops 1:", totalOps1);
    
    // Now split inside -003 (qty 200, ops = opsMap.get('-003'))
    let remainingInvoiceOps2 = opsMap.get('KB-TRN-29052026-003');
    let remainingSdQty2 = 200;
    const items2 = [5, 195];
    let totalOps2 = 0;
    
    console.log("Split for -003:");
    items2.forEach(qty => {
        const rowOps = remainingSdQty2 > 0 ? Math.round(remainingInvoiceOps2 * (qty / remainingSdQty2)) : 0;
        remainingInvoiceOps2 -= rowOps;
        remainingSdQty2 -= qty;
        console.log(`Qty: ${qty}, Ops: ${rowOps}`);
        totalOps2 += rowOps;
    });
    console.log("Total Ops 2:", totalOps2);
    
    console.log("Grand Total Ops:", totalOps1 + totalOps2);
}
testSplit();
