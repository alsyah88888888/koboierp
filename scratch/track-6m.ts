import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const startDate = new Date('2026-06-01T00:00:00Z');
    const endDate = new Date('2026-06-30T23:59:59Z');
    const prefix = 'BC';

    // 1. Get all BC deliveries in June
    const deliveriesBC = await prisma.salesDelivery.findMany({
        where: { date: { gte: startDate, lte: endDate }, isVoid: false, salesPerson: prefix },
        include: { items: { select: { quantity: true } } }
    });
    const invBC = deliveriesBC.map(d => d.invoiceNumber || d.deliveryNumber).filter(Boolean);
    
    // 2. Find ALL ops linked to these deliveries (Traceability logic)
    const traceOpsAll = await prisma.financeTransaction.findMany({
        where: {
            OR: invBC.map(inv => ({ invoiceNumber: { contains: inv } })),
            category: { notIn: ["PEMBELIAN", "PENJUALAN", "TRANSFER"] }
        }
    });

    // 3. To find proportional split, we need ALL deliveries for these invoices
    const allInvolvedInvoices = new Set<string>();
    traceOpsAll.forEach((t: any) => {
        if (t.invoiceNumber) {
            t.invoiceNumber.split(',').forEach((i: string) => allInvolvedInvoices.add(i.trim()));
        }
    });
    const allInvolvedArray = Array.from(allInvolvedInvoices).filter(Boolean);

    const allDeliveriesForInvoices = allInvolvedArray.length > 0 
        ? await prisma.salesDelivery.findMany({
            where: { OR: [ { invoiceNumber: { in: allInvolvedArray } }, { deliveryNumber: { in: allInvolvedArray } } ], isVoid: false },
            include: { items: { select: { quantity: true } } }
        }) : [];

    // Calculate how much of each FinanceTransaction belongs to BC
    const trackingList: any[] = [];
    let totalMissing = 0;

    for (const ops of traceOpsAll) {
        // Is this ops OUTSIDE June?
        const isOutsideJune = ops.date < startDate || ops.date > endDate;
        
        // If it IS in June, wait, let's see if it's missing for another reason.
        // We will calculate its BC portion anyway.
        
        const invList = ops.invoiceNumber?.split(',').map((s: string) => s.trim()).filter(Boolean) || [];
        if (invList.length === 0) continue;
        
        const deliveriesForThisOps = allDeliveriesForInvoices.filter((d: any) => 
            invList.includes(d.invoiceNumber!) || invList.includes(d.deliveryNumber)
        );
        
        let grandQty = 0;
        let bcQty = 0;
        
        deliveriesForThisOps.forEach(d => {
            const qty = d.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 1;
            grandQty += qty;
            if (d.salesPerson === prefix) {
                bcQty += qty;
            }
        });
        
        if (grandQty > 0 && bcQty > 0) {
            const bcAmount = Math.round(Math.abs(Number(ops.amount)) * (bcQty / grandQty));
            
            if (isOutsideJune) {
                trackingList.push({
                    date: ops.date.toISOString().split('T')[0],
                    desc: ops.description,
                    totalOps: Math.abs(Number(ops.amount)),
                    bcPortion: bcAmount,
                    invoices: ops.invoiceNumber,
                    reason: 'Dibayar di luar bulan Juni (Beda Bulan)'
                });
                totalMissing += bcAmount;
            }
        }
    }
    
    // Also, we need to check if there are any Detail Ops IN June that are linked to Deliveries OUTSIDE June.
    // Because Detail Ops (Linked) will INCLUDE them, while Traceability (June) EXCLUDES them.
    // This makes the Difference even larger or smaller.
    // DetailOps Linked = (TraceOps paid in June matching June Deliveries) + (Ops paid in June matching OUTSIDE June Deliveries)
    
    const allOpsInJune = await prisma.financeTransaction.findMany({
        where: { date: { gte: startDate, lte: endDate }, category: 'OPERASIONAL' }
    });
    
    for (const ops of allOpsInJune) {
        if (!ops.invoiceNumber) continue;
        const invList = ops.invoiceNumber.split(',').map((s: string) => s.trim()).filter(Boolean);
        if (invList.length === 0) continue;
        
        // If this ops is NOT in traceOpsAll, it means it is linked to deliveries outside June!
        if (!traceOpsAll.find(t => t.id === ops.id)) {
            // Find its deliveries
            const deliveries = await prisma.salesDelivery.findMany({
                where: { OR: [ { invoiceNumber: { in: invList } }, { deliveryNumber: { in: invList } } ], isVoid: false },
                include: { items: { select: { quantity: true } } }
            });
            
            let grandQty = 0;
            let bcQty = 0;
            let deliveryDates = new Set<string>();
            deliveries.forEach(d => {
                const qty = d.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 1;
                grandQty += qty;
                if (d.salesPerson === prefix) {
                    bcQty += qty;
                    deliveryDates.add(d.date.toISOString().split('T')[0]);
                }
            });
            
            if (grandQty > 0 && bcQty > 0) {
                const bcAmount = Math.round(Math.abs(Number(ops.amount)) * (bcQty / grandQty));
                trackingList.push({
                    date: ops.date.toISOString().split('T')[0],
                    desc: ops.description,
                    totalOps: Math.abs(Number(ops.amount)),
                    bcPortion: -bcAmount, // Negative because this REDUCES the gap between Traceability and Detail Ops!
                    invoices: ops.invoiceNumber,
                    reason: `Kasir bayar di Juni, tapi SJ terbit di: ${Array.from(deliveryDates).join(', ')}`
                });
                totalMissing -= bcAmount;
            }
        }
    }

    console.log(`\n=== DAFTAR TRANSAKSI SELISIH KASIR VS SURAT JALAN ===`);
    trackingList.forEach(t => {
        console.log(`- Tgl Kasir: ${t.date} | Rp ${t.bcPortion} | ${t.reason} | ${t.invoices}`);
        // console.log(`  Ket: ${t.desc}`);
    });
    console.log(`Total Selisih Terlacak: Rp ${totalMissing}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
