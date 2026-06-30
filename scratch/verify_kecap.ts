import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOpsDistribution() {
    console.log("=== CHECK OPS DISTRIBUTION ACROSS ITEMS ===\n");

    const startDate = new Date('2026-06-01T00:00:00+07:00');
    const endDate = new Date('2026-06-30T23:59:59+07:00');

    // 1. Ambil data SD
    const deliveries = await prisma.salesDelivery.findMany({
        where: { isVoid: false, date: { gte: startDate, lte: endDate } },
        include: { items: { include: { product: { select: { name: true } } } } },
        orderBy: { date: 'asc' }
    });

    // 2. Ambil data OPS (FinanceTransaction)
    const invoiceNumbers = deliveries.map(d => d.invoiceNumber || d.deliveryNumber).filter(Boolean);
    const opsTransactions = await prisma.financeTransaction.findMany({
        where: { OR: invoiceNumbers.map(inv => ({ invoiceNumber: { contains: inv } })) },
        select: { invoiceNumber: true, amount: true, transactionType: true }
    });

    const opsMap = new Map<string, number>();
    opsTransactions.forEach(t => {
        if (!t.invoiceNumber) return;
        const amt = (t.transactionType === "PAYMENT" || t.transactionType === "EXPENSE" || Number(t.amount) < 0)
            ? Math.abs(Number(t.amount)) : -Math.abs(Number(t.amount));
        const invoices = t.invoiceNumber.split(',').map(i => i.trim()).filter(Boolean);
        if (invoices.length > 0) {
            let totalQty = 0;
            const qtyMap = new Map<string, number>();
            invoices.forEach(inv => {
                const md = deliveries.find(d => d.invoiceNumber === inv || d.deliveryNumber === inv);
                let qty = 1;
                if (md && md.items) {
                    qty = md.items.reduce((s, i) => s + Number(i.quantity || 0), 0) || 1;
                }
                totalQty += qty;
                qtyMap.set(inv, qty);
            });
            let remainingAmt = amt;
            let remainingQty = totalQty;
            invoices.forEach((inv, index) => {
                const qty = qtyMap.get(inv) || 1;
                const splitAmt = remainingQty > 0 ? Math.round(remainingAmt * (qty / remainingQty)) : Math.round(remainingAmt / (invoices.length - index));
                remainingAmt -= splitAmt;
                remainingQty -= qty;
                opsMap.set(inv, (opsMap.get(inv) || 0) + splitAmt);
            });
        }
    });

    // 3. Distribusi Antar Delivery (Fix tadi)
    const invoiceToDeliveries = new Map<string, { deliveryNumber: string; totalQty: number }[]>();
    for (const sd of deliveries) {
        const inv = sd.invoiceNumber || sd.deliveryNumber;
        if (!invoiceToDeliveries.has(inv)) invoiceToDeliveries.set(inv, []);
        const sdQty = sd.items.reduce((s, i) => s + Number(i.quantity || 0), 0) || 1;
        invoiceToDeliveries.get(inv)!.push({ deliveryNumber: sd.deliveryNumber, totalQty: sdQty });
    }

    const opsMapByDelivery = new Map<string, number>();
    for (const [inv, totalOps] of opsMap) {
        const shared = invoiceToDeliveries.get(inv) || [];
        if (shared.length <= 1) {
            opsMapByDelivery.set(inv, totalOps);
        } else {
            const grandQty = shared.reduce((s, d) => s + d.totalQty, 0);
            let remaining = totalOps;
            for (let i = 0; i < shared.length; i++) {
                const share = i < shared.length - 1 ? Math.round(totalOps * (shared[i].totalQty / grandQty)) : remaining;
                remaining -= share;
                opsMapByDelivery.set(shared[i].deliveryNumber, (opsMapByDelivery.get(shared[i].deliveryNumber) || 0) + share);
            }
        }
    }

    // 4. Periksa distribusi antar Item (dalam SJ yg punya multi-item)
    console.log("=== CHECKING DELIVERIES WITH MULTIPLE PRODUCTS AND OPS ===\n");
    for (const sd of deliveries) {
        const refNum = sd.invoiceNumber || sd.deliveryNumber;
        const totalOps = opsMapByDelivery.get(sd.deliveryNumber) ?? opsMapByDelivery.get(refNum) ?? opsMap.get(refNum) ?? 0;
        
        // Merge items logic
        const mergedMap = new Map();
        for (const i of sd.items) {
            if (mergedMap.has(i.productId)) {
                mergedMap.get(i.productId).quantity += i.quantity;
            } else {
                mergedMap.set(i.productId, { name: i.product.name, quantity: i.quantity });
            }
        }
        const mergedItems = Array.from(mergedMap.values());

        if (mergedItems.length > 1 && totalOps > 0) {
            console.log(`SJ: ${sd.deliveryNumber} | Invoice: ${sd.invoiceNumber}`);
            console.log(`Total OPS Delivery: Rp ${totalOps.toLocaleString()} | Products: ${mergedItems.length}`);
            
            let remainingOps = totalOps;
            let remainingQty = sd.items.reduce((s, i) => s + i.quantity, 0);
            
            for (const item of mergedItems) {
                const rowOps = remainingQty > 0 ? Math.round(remainingOps * (item.quantity / remainingQty)) : 0;
                remainingOps -= rowOps;
                remainingQty -= item.quantity;
                console.log(`  - ${item.name.substring(0, 30)} (Qty: ${item.quantity}) -> OPS Share: Rp ${rowOps.toLocaleString()}`);
            }
            console.log();
        }
    }
}

checkOpsDistribution()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
