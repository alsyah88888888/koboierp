import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const startDate = new Date('2026-06-01T00:00:00Z');
    const endDate = new Date('2026-06-30T23:59:59Z');
    const prefix = 'BC';

    const deliveriesBC = await prisma.salesDelivery.findMany({
        where: { date: { gte: startDate, lte: endDate }, isVoid: false, salesPerson: prefix },
        include: { items: { select: { quantity: true } } }
    });
    const invBC = deliveriesBC.map(d => d.invoiceNumber || d.deliveryNumber).filter(Boolean);
    
    const traceOpsBC = await prisma.financeTransaction.findMany({
        where: {
            OR: invBC.map(inv => ({ invoiceNumber: { contains: inv } })),
            category: { notIn: ["PEMBELIAN", "PENJUALAN", "TRANSFER"] }
        }
    });

    let sumTraceOpsBC = 0;
    const opsMapByDelivery = new Map<string, number>();
    const allInvolvedInvoices = new Set<string>();
    traceOpsBC.forEach((t: any) => {
        if (t.invoiceNumber) {
            t.invoiceNumber.split(',').forEach((i: string) => allInvolvedInvoices.add(i.trim()));
        }
    });
    const allInvolvedArray = Array.from(allInvolvedInvoices).filter(Boolean);

    const allDeliveriesForInvoices = allInvolvedArray.length > 0 
        ? await (prisma as any).salesDelivery.findMany({
            where: { OR: [ { invoiceNumber: { in: allInvolvedArray } }, { deliveryNumber: { in: allInvolvedArray } } ], isVoid: false },
            include: { items: { select: { quantity: true } } }
        }) : [];
    
    const opsMap = new Map<string, number>();
    traceOpsBC.forEach((t: any) => {
        if (!t.invoiceNumber) return;
        const amt = Math.abs(Number(t.amount));
        const invList = t.invoiceNumber.split(',').map((s: string) => s.trim()).filter(Boolean);
        const amtPerInvoice = amt / invList.length;
        for (const inv of invList) {
            opsMap.set(inv, (opsMap.get(inv) || 0) + amtPerInvoice);
        }
    });

    for (const [inv, totalOps] of opsMap) {
        const sharedDeliveries = allDeliveriesForInvoices.filter((d: any) => d.invoiceNumber === inv || d.deliveryNumber === inv);
        if (sharedDeliveries.length === 0) continue;
        if (sharedDeliveries.length === 1) {
            opsMapByDelivery.set(sharedDeliveries[0].deliveryNumber, totalOps);
        } else {
            const grandQty = sharedDeliveries.reduce((sum: number, d: any) => sum + d.items.reduce((q: number, i: any) => q + Number(i.quantity || 0), 0), 0);
            if (grandQty > 0) {
                for (let i = 0; i < sharedDeliveries.length; i++) {
                    const deliveryQty = sharedDeliveries[i].items.reduce((q: number, i: any) => q + Number(i.quantity || 0), 0);
                    let prop = Math.round(totalOps * (deliveryQty / grandQty));
                    opsMapByDelivery.set(sharedDeliveries[i].deliveryNumber, prop);
                }
            }
        }
    }

    deliveriesBC.forEach(d => {
        const amt = opsMapByDelivery.get(d.deliveryNumber) || opsMapByDelivery.get(d.invoiceNumber as string) || 0;
        if (amt > 0) sumTraceOpsBC += amt;
    });

    // 2. Detail Operasional Logic for BC
    const allOpsInJune = await prisma.financeTransaction.findMany({
        where: { date: { gte: startDate, lte: endDate }, category: 'OPERASIONAL' }
    });
    
    let sumDetailLinkedBC = 0;

    for (const ops of allOpsInJune) {
        if (!ops.invoiceNumber) continue;

        const invoices = ops.invoiceNumber.split(',').map((inv: string) => inv.trim()).filter(Boolean);
        if (invoices.length === 0) continue;

        const deliveries = await prisma.salesDelivery.findMany({
            where: { OR: [ { invoiceNumber: { in: invoices } }, { deliveryNumber: { in: invoices } } ], isVoid: false },
            include: { items: { select: { quantity: true } } }
        });
        
        let totalQtyAll = 0;
        let totalQtyDivision = 0;
        
        deliveries.forEach((d: any) => {
            const qty = d.items.reduce((q: number, i: any) => q + Number(i.quantity || 0), 0) || 1;
            totalQtyAll += qty;
            if ((d.salesPerson || '').startsWith(prefix)) {
                totalQtyDivision += qty;
            }
        });

        if (totalQtyAll === 0) continue;

        if (totalQtyDivision > 0) {
            const propAmount = Math.round(Number(ops.amount || 0) * (totalQtyDivision / totalQtyAll));
            sumDetailLinkedBC += propAmount;
        }
    }

    console.log(`Traceability Ops:`, sumTraceOpsBC);
    console.log(`Detail Ops (Linked ONLY):`, sumDetailLinkedBC);
    console.log(`Diff:`, sumTraceOpsBC - sumDetailLinkedBC);

    const traceOpsOutsideJune = traceOpsBC.filter(o => o.date < startDate || o.date > endDate);
    let traceOutsideSum = 0;
    traceOpsOutsideJune.forEach(o => traceOutsideSum += Number(o.amount));
    console.log(`\nTraceability Ops Paid OUTSIDE June: ${traceOutsideSum} (from ${traceOpsOutsideJune.length} txs)`);

    const opsLinkedToOutside = allOpsInJune.filter(o => o.invoiceNumber && !traceOpsBC.find(t => t.id === o.id));
    let opsOutsideSum = 0;
    opsLinkedToOutside.forEach(o => opsOutsideSum += Number(o.amount));
    console.log(`Detail Ops Paid IN June but linked to OUTSIDE June Deliveries: ${opsOutsideSum} (from ${opsLinkedToOutside.length} txs)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
