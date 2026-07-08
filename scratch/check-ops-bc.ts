import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const startDate = new Date('2026-06-01T00:00:00Z');
    const endDate = new Date('2026-06-30T23:59:59Z');
    const prefix = 'BC';

    // 1. Traceability Logic for BC
    const deliveriesBC = await prisma.salesDelivery.findMany({
        where: { date: { gte: startDate, lte: endDate }, isVoid: false, salesPerson: prefix },
        include: { items: { select: { quantity: true } } }
    });
    const invBC = deliveriesBC.map(d => d.invoiceNumber || d.deliveryNumber).filter(Boolean);
    
    // Find all ops for these BC invoices
    const traceOpsBC = await prisma.financeTransaction.findMany({
        where: {
            OR: invBC.map(inv => ({ invoiceNumber: { contains: inv } })),
            category: { notIn: ["PEMBELIAN", "PENJUALAN", "TRANSFER"] }
        }
    });

    // Proportional logic
    let totalTraceOpsBC = 0;
    
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
        totalTraceOpsBC += (opsMapByDelivery.get(d.deliveryNumber) || opsMapByDelivery.get(d.invoiceNumber) || 0);
    });

    console.log(`=== Traceability OPS for BC ===`);
    console.log(`Total Linked Ops distributed to BC deliveries: ${totalTraceOpsBC}`);


    // 2. Detail Operasional Logic for BC
    const allOpsInJune = await prisma.financeTransaction.findMany({
        where: { date: { gte: startDate, lte: endDate }, category: 'OPERASIONAL' }
    });
    
    let totalDetailOpsBC = 0;
    for (const ops of allOpsInJune) {
        if (!ops.invoiceNumber) {
            if ((ops.salesPerson || '').startsWith(prefix)) {
                totalDetailOpsBC += Number(ops.amount);
            }
            continue;
        }

        const invoices = ops.invoiceNumber.split(',').map((inv: string) => inv.trim()).filter(Boolean);
        if (invoices.length === 0) {
            if ((ops.salesPerson || '').startsWith(prefix)) {
                totalDetailOpsBC += Number(ops.amount);
            }
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
            if ((d.salesPerson || '').startsWith(prefix)) {
                totalQtyDivision += qty;
            }
        });

        if (totalQtyAll === 0) {
            if ((ops.salesPerson || '').startsWith(prefix)) {
                totalDetailOpsBC += Number(ops.amount);
            }
            continue;
        }

        if (totalQtyDivision > 0) {
            const propAmount = Math.round(Number(ops.amount || 0) * (totalQtyDivision / totalQtyAll));
            totalDetailOpsBC += propAmount;
        }
    }

    console.log(`=== Detail Operasional OPS for BC ===`);
    console.log(`Total Detail Ops distributed to BC: ${totalDetailOpsBC}`);

}

main().catch(console.error).finally(() => prisma.$disconnect());
