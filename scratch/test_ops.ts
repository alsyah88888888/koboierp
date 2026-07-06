import { getPrisma } from "./src/lib/prisma";

async function testTrace() {
    const prisma = getPrisma();
    const startDate = new Date('2026-06-01');
    const endDate = new Date('2026-06-30');
    
    const deliveries = await (prisma as any).salesDelivery.findMany({
        where: { 
            invoiceNumber: 'KB-TRN-29062026-002',
            isVoid: false, 
        },
        include: {
            items: {
                include: {
                    product: {
                        select: { id: true, sku: true, name: true, uom: true, barcode: true, purchasePrice: true }
                    },
                    lotAllocations: { include: { lot: true } }
                }
            }
        }
    });

    console.log(`Deliveries found: ${deliveries.length}`);
    const invoiceNumbers = deliveries.map((d: any) => d.invoiceNumber || d.deliveryNumber).filter(Boolean);
    console.log(`Invoice numbers:`, invoiceNumbers);
    
    const opsTransactions = invoiceNumbers.length > 0
        ? await (prisma as any).financeTransaction.findMany({
            where: {
                OR: invoiceNumbers.map((inv: string) => ({ invoiceNumber: { contains: inv } }))
            },
            select: { invoiceNumber: true, amount: true, transactionType: true, date: true }
        })
        : [];
        
    console.log(`Ops Transactions found:`, opsTransactions);
    
    const opsMap = new Map<string, number>();
    opsTransactions.forEach((t: any) => {
        if (!t.invoiceNumber) return;
        const amt = (t.transactionType === "PAYMENT" || t.transactionType === "EXPENSE" || Number(t.amount) < 0)
            ? Math.abs(Number(t.amount))
            : -Math.abs(Number(t.amount));
        console.log(`Ops Transaction ${t.invoiceNumber} amt: ${amt}`);
        
        const invoices = t.invoiceNumber.split(',').map((inv: string) => inv.trim()).filter(Boolean);
        if (invoices.length > 0) {
            let totalQty = 0;
            const qtyMap = new Map<string, number>();
            invoices.forEach((inv: string) => {
                const matchingDelivery = deliveries.find((d: any) => d.invoiceNumber === inv || d.deliveryNumber === inv);
                let qty = 1;
                if (matchingDelivery && matchingDelivery.items) {
                    qty = matchingDelivery.items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0);
                    if (qty === 0) qty = 1;
                }
                totalQty += qty;
                qtyMap.set(inv, qty);
            });
            let remainingAmt = amt;
            let remainingQty = totalQty;
            invoices.forEach((inv: string, index: number) => {
                const qty = qtyMap.get(inv) || 1;
                const splitAmt = remainingQty > 0 ? Math.round(remainingAmt * (qty / remainingQty)) : Math.round(remainingAmt / (invoices.length - index));
                remainingAmt -= splitAmt;
                remainingQty -= qty;
                opsMap.set(inv, (opsMap.get(inv) || 0) + splitAmt);
                console.log(`Assigning ops to ${inv}: ${splitAmt}`);
            });
        }
    });

    console.log('Final opsMap:', Array.from(opsMap.entries()));

    const opsMapByDelivery = new Map<string, number>();
    for (const [inv, totalOps] of opsMap) {
        const sharedDeliveries = deliveries.filter((d: any) => d.invoiceNumber === inv);
        console.log(`Shared deliveries for ${inv}:`, sharedDeliveries.length);
        if (sharedDeliveries.length <= 1) {
            opsMapByDelivery.set(inv, totalOps);
        } else {
            const grandQty = sharedDeliveries.reduce((sum, d) => 
                sum + d.items.reduce((s: number, i: any) => s + Number(i.quantity), 0), 0);
            
            let remaining = totalOps;
            for (let i = 0; i < sharedDeliveries.length; i++) {
                const share = (i === sharedDeliveries.length - 1)
                    ? remaining
                    : (grandQty > 0 
                        ? Math.round(totalOps * (sharedDeliveries[i].items.reduce((s: number, it: any) => s + Number(it.quantity), 0) / grandQty))
                        : 0);
                opsMapByDelivery.set(sharedDeliveries[i].deliveryNumber, 
                    (opsMapByDelivery.get(sharedDeliveries[i].deliveryNumber) || 0) + share);
                remaining -= share;
                console.log(`Assigning share ${share} to delivery ${sharedDeliveries[i].deliveryNumber}`);
            }
        }
    }

    console.log('Final opsMapByDelivery:', Array.from(opsMapByDelivery.entries()));

    for (const sd of deliveries) {
        const refNum = sd.invoiceNumber || sd.deliveryNumber;
        const invoiceOps = opsMapByDelivery.get(sd.deliveryNumber) ?? opsMapByDelivery.get(refNum) ?? opsMap.get(refNum) ?? 0;
        console.log(`Delivery ${sd.deliveryNumber}, refNum: ${refNum}, invoiceOps: ${invoiceOps}`);
    }
}
testTrace().catch(console.error);
