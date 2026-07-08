import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const startDate = new Date('2026-06-01T00:00:00Z');
    const endDate = new Date('2026-06-30T23:59:59Z');

    // Run the actual Traceability logic for BC
    const deliveriesBC = await prisma.salesDelivery.findMany({
        where: { date: { gte: startDate, lte: endDate }, isVoid: false, salesPerson: 'BC' }
    });
    console.log("Total BC deliveries:", deliveriesBC.length);
    
    // Let's just calculate it directly.
    const invBC = deliveriesBC.map(d => d.invoiceNumber || d.deliveryNumber).filter(Boolean);
    const traceOpsBC = await prisma.financeTransaction.findMany({
        where: {
            OR: invBC.map(inv => ({ invoiceNumber: { contains: inv } })),
            category: { notIn: ["PEMBELIAN", "PENJUALAN", "TRANSFER"] }
        }
    });

    let totalOpsTraceability = 0;
    
    // This is how report-service.ts does it:
    const opsMapByDelivery = new Map<string, number>();
    const allInvolvedInvoices = new Set<string>();
    traceOpsBC.forEach((t: any) => {
        if (t.invoiceNumber) {
            t.invoiceNumber.split(',').forEach((i: string) => allInvolvedInvoices.add(i.trim()));
        }
    });
    const allInvolvedArray = Array.from(allInvolvedInvoices).filter(Boolean);

    const allDeliveriesForInvoices = allInvolvedArray.length > 0 ? await prisma.salesDelivery.findMany({
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
        totalOpsTraceability += (opsMapByDelivery.get(d.deliveryNumber) || opsMapByDelivery.get(d.invoiceNumber as string) || 0);
    });

    console.log("Traceability BC calculated Ops:", totalOpsTraceability);

    // Now Detail Operasional
    const allOps = await prisma.financeTransaction.findMany({
        where: { date: { gte: startDate, lte: endDate }, category: 'OPERASIONAL' }
    });

    let totalLinkedBCDetail = 0;
    const trackingDetail: any[] = [];
    
    // We replicate distributeOperationalCosts
    for (const ops of allOps) {
        if (!ops.invoiceNumber) {
            continue; // We only care about linked! The user said "ketika saya sortir untuk fokus pada surat jalan saya tarik sejumlah 275770011"
        }

        const invoices = ops.invoiceNumber.split(',').map((inv: string) => inv.trim()).filter(Boolean);
        if (invoices.length === 0) {
            continue;
        }

        const deliveries = await prisma.salesDelivery.findMany({
            where: { OR: [ { invoiceNumber: { in: invoices } }, { deliveryNumber: { in: invoices } } ], isVoid: false },
            include: { items: { select: { quantity: true } } }
        });
        
        let totalQtyAll = 0;
        let totalQtyDivision = 0;
        
        deliveries.forEach((d: any) => {
            const qty = d.items.reduce((q: number, i: any) => q + Number(i.quantity || 0), 0) || 1;
            totalQtyAll += qty;
            if ((d.salesPerson || '').startsWith('BC')) {
                totalQtyDivision += qty;
            }
        });

        if (totalQtyAll === 0) {
            continue;
        }

        if (totalQtyDivision > 0) {
            const propAmount = Math.round(Number(ops.amount || 0) * (totalQtyDivision / totalQtyAll));
            totalLinkedBCDetail += propAmount;
            trackingDetail.push({ id: ops.id, amount: propAmount, desc: ops.description, date: ops.date });
        }
    }

    console.log("Detail Ops Linked BC:", totalLinkedBCDetail);
    console.log("Difference:", totalOpsTraceability - totalLinkedBCDetail);
}

main().catch(console.error).finally(() => prisma.$disconnect());
