import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const startDate = new Date('2026-06-01T00:00:00Z');
    const endDate = new Date('2026-06-30T23:59:59Z');

    // 1. Get all deliveries in June
    const deliveries = await prisma.salesDelivery.findMany({
        where: { date: { gte: startDate, lte: endDate }, isVoid: false },
        include: { items: { select: { quantity: true } } }
    });
    const invoices = deliveries.map(d => d.invoiceNumber || d.deliveryNumber).filter(Boolean);
    
    // 2. Find ALL ops linked to these deliveries (Traceability logic)
    const traceOpsAll = await prisma.financeTransaction.findMany({
        where: {
            OR: invoices.map(inv => ({ invoiceNumber: { contains: inv } })),
            category: { notIn: ["PEMBELIAN", "PENJUALAN", "TRANSFER"] }
        }
    });

    let tracePaidOutsideJune = 0;
    const opsOutside: any[] = [];
    traceOpsAll.forEach(ops => {
        if (ops.date < startDate || ops.date > endDate) {
            tracePaidOutsideJune += Number(ops.amount);
            opsOutside.push({ id: ops.id, date: ops.date.toISOString().split('T')[0], amount: Number(ops.amount), inv: ops.invoiceNumber });
        }
    });

    // 3. Detail Ops (Linked) paid IN June but linked to Deliveries OUTSIDE June
    const allOpsInJune = await prisma.financeTransaction.findMany({
        where: { date: { gte: startDate, lte: endDate }, category: 'OPERASIONAL' }
    });

    let detailOpsOutsideJune = 0;
    const detailOpsOutsideList: any[] = [];
    allOpsInJune.forEach(ops => {
        if (ops.invoiceNumber && !traceOpsAll.find(t => t.id === ops.id)) {
            detailOpsOutsideJune += Number(ops.amount);
            detailOpsOutsideList.push({ id: ops.id, date: ops.date.toISOString().split('T')[0], amount: Number(ops.amount), inv: ops.invoiceNumber });
        }
    });

    console.log(`=== SELISIH KESELURUHAN (SEMUA DIVISI) ===`);
    console.log(`Traceability Ops dibayar DI LUAR Juni (Akan menambah Traceability): Rp ${tracePaidOutsideJune}`);
    opsOutside.forEach(o => console.log(`  + Tgl ${o.date} | Rp ${o.amount} | Inv: ${o.inv}`));
    
    console.log(`\nDetail Ops dibayar DI JUNI tapi SJ BUKAN Juni (Akan menambah Detail Ops Linked): Rp ${detailOpsOutsideJune}`);
    detailOpsOutsideList.forEach(o => console.log(`  - Tgl ${o.date} | Rp ${o.amount} | Inv: ${o.inv}`));
    
    console.log(`\nTOTAL SELISIH MURNI DARI PERBEDAAN TANGGAL: Rp ${tracePaidOutsideJune - detailOpsOutsideJune}`);

}

main().catch(console.error).finally(() => prisma.$disconnect());
