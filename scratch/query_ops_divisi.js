const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function calcForPeriodDivisi(startDate, endDate, divisi, label) {
  const salesWhere = { 
    isVoid: false, 
    date: { gte: startDate, lte: endDate },
    ...(divisi !== 'ALL' ? { salesPerson: divisi } : {})
  };

  const sales = await prisma.salesDelivery.findMany({
    where: salesWhere,
    select: { invoiceNumber: true, deliveryNumber: true, grandTotal: true, salesPerson: true }
  });

  const purchases = await prisma.goodsReceipt.findMany({
    where: { 
      isVoid: false, date: { gte: startDate, lte: endDate },
      ...(divisi !== 'ALL' ? { salesPerson: divisi } : {})
    },
    select: { grandTotal: true }
  });

  const deliveryInvoices = [...new Set(
    sales.map(s => s.invoiceNumber || s.deliveryNumber).filter(Boolean)
  )];

  // Unlinked ops (operasional tanpa invoiceNumber)
  const unlinkedOps = await prisma.financeTransaction.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
      category: 'OPERASIONAL',
      OR: [{ invoiceNumber: null }, { invoiceNumber: '' }],
      ...(divisi !== 'ALL' ? { salesPerson: divisi } : {})
    }
  });

  // Linked ops (operasional dengan invoiceNumber)
  const linkedOps = [];
  if (deliveryInvoices.length > 0) {
    for (let i = 0; i < deliveryInvoices.length; i += 50) {
      const chunk = deliveryInvoices.slice(i, i + 50);
      const chunkOps = await prisma.financeTransaction.findMany({
        where: {
          OR: chunk.map(inv => ({ invoiceNumber: { contains: inv } })),
          category: { notIn: ['PEMBELIAN', 'PENJUALAN', 'TRANSFER'] }
        }
      });
      linkedOps.push(...chunkOps);
    }
  }

  const generalOpsExp = unlinkedOps.filter(o =>
    o.transactionType === 'PAYMENT' || o.transactionType === 'EXPENSE' || Number(o.amount) < 0
  );
  const generalOpsTotal = generalOpsExp.reduce((s, o) => s + Math.abs(Number(o.amount || 0)), 0);

  const linkedOpsExp = linkedOps.filter(o =>
    o.transactionType === 'PAYMENT' || o.transactionType === 'EXPENSE' || Number(o.amount) < 0
  );
  const linkedOpsTotal = linkedOpsExp.reduce((s, o) => s + Math.abs(Number(o.amount || 0)), 0);

  const totalExpenses = generalOpsTotal + linkedOpsTotal;
  const totalSales = sales.reduce((s, d) => s + Number(d.grandTotal || 0), 0);
  const totalPurchases = purchases.reduce((s, p) => s + Number(p.grandTotal || 0), 0);

  const isMatch = Math.abs(generalOpsTotal - 5574155) < 100000 || 
                  Math.abs(linkedOpsTotal - 31854596) < 100000 ||
                  Math.abs(totalExpenses - 37428751) < 100000 ||
                  Math.abs(totalSales - 11301028025) < 50000000;

  if (isMatch) {
    console.log(`\n★★★ COCOK - ${label} [Divisi: ${divisi}] ★★★`);
    console.log(`  Total Penjualan  : Rp ${totalSales.toLocaleString('id-ID')}`);
    console.log(`  Total Pembelian  : Rp ${totalPurchases.toLocaleString('id-ID')}`);
    console.log(`  Ops Kirim & Muat : Rp ${linkedOpsTotal.toLocaleString('id-ID')}`);
    console.log(`  Ops (General)    : Rp ${generalOpsTotal.toLocaleString('id-ID')}`);
    console.log(`  TOTAL OPS        : Rp ${totalExpenses.toLocaleString('id-ID')}`);
    console.log(`  Sales count      : ${sales.length} | Purchases: ${purchases.length}`);
    
    if (generalOpsExp.length > 0) {
      console.log(`\n  ─── RINCIAN OPS GENERAL (${generalOpsExp.length} transaksi) ─────────────────────`);
      let cum = 0;
      generalOpsExp.forEach((o, i) => {
        const tgl = new Date(o.date).toLocaleDateString('id-ID');
        const amt = Math.abs(Number(o.amount || 0));
        cum += amt;
        console.log(`  ${String(i+1).padStart(3)}. ${tgl} | ${(o.referenceNumber||'-').padEnd(25)} | ${(o.description||'-').substring(0,50)} | ${(o.bank||'-').padEnd(6)} | Rp ${amt.toLocaleString('id-ID')}`);
      });
      console.log(`  ────────────────────────────────────────────────────────────`);
      console.log(`  TOTAL OPS GENERAL: Rp ${cum.toLocaleString('id-ID')}`);
    }
  } else {
    // just print summary
    process.stdout.write(`[${divisi}] ${label.substring(0,30).padEnd(30)} | Penjualan: ${totalSales.toLocaleString('id-ID').padStart(16)} | OpsGeneral: ${generalOpsTotal.toLocaleString('id-ID').padStart(12)} | OpsLinked: ${linkedOpsTotal.toLocaleString('id-ID').padStart(12)} | Total OPS: ${totalExpenses.toLocaleString('id-ID').padStart(12)}\n`);
  }
}

async function main() {
  // Periode yang terlihat dari screenshot: Total Penjualan 11.301.028.025
  // Ini adalah angka besar → kemungkinan laporan mingguan/bulanan 
  // Coba semua divisi + berbagai periode (fokus bulanan karena nilainya besar)
  
  const periods = [];
  // Bulan 6 terakhir
  const base = new Date('2026-07-24');
  for (let m = 0; m < 7; m++) {
    const d = new Date(base);
    d.setMonth(d.getMonth() - m);
    const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    periods.push({ start, end, label: `${start.toLocaleDateString('id-ID', {month:'long', year:'numeric'})}` });
  }
  // Minggu-minggu (12 minggu terakhir)
  for (let w = 0; w < 12; w++) {
    const end = new Date(base);
    end.setDate(end.getDate() - w * 7);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    periods.push({ start, end, label: `Minggu ${start.toLocaleDateString('id-ID')}` });
  }

  const divisions = ['ALL', 'BC', 'PF'];
  for (const divisi of divisions) {
    console.log(`\n════ DIVISI: ${divisi} ════`);
    for (const p of periods) {
      await calcForPeriodDivisi(p.start, p.end, divisi, p.label);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
