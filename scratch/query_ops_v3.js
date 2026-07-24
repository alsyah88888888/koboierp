const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Reproduksi persis logika getComprehensiveWeeklyReportService
// dengan berbagai periode, termasuk bulan untuk menemukan angka 5.574.155
async function calcForPeriod(startDate, endDate, label) {
  const sales = await prisma.salesDelivery.findMany({
    where: { isVoid: false, date: { gte: startDate, lte: endDate } },
    select: { invoiceNumber: true, deliveryNumber: true, grandTotal: true, salesPerson: true }
  });

  const purchases = await prisma.goodsReceipt.findMany({
    where: { isVoid: false, date: { gte: startDate, lte: endDate } },
    select: { grandTotal: true }
  });

  const deliveryInvoices = [...new Set(
    sales.map(s => s.invoiceNumber || s.deliveryNumber).filter(Boolean)
  )];

  // unlinked ops
  const unlinkedOps = await prisma.financeTransaction.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
      category: 'OPERASIONAL',
      OR: [{ invoiceNumber: null }, { invoiceNumber: '' }]
    }
  });

  // linked ops
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

  const generalOpsExpenses = unlinkedOps.filter(o =>
    o.transactionType === 'PAYMENT' || o.transactionType === 'EXPENSE' || Number(o.amount) < 0
  );
  const generalOpsTotal = generalOpsExpenses.reduce((s, o) => s + Math.abs(Number(o.amount || 0)), 0);
  const linkedOpsExpenses = linkedOps.filter(o =>
    o.transactionType === 'PAYMENT' || o.transactionType === 'EXPENSE' || Number(o.amount) < 0
  );
  const linkedOpsTotal = linkedOpsExpenses.reduce((s, o) => s + Math.abs(Number(o.amount || 0)), 0);
  const totalExpenses = generalOpsTotal + linkedOpsTotal;
  const totalSales = sales.reduce((s, d) => s + Number(d.grandTotal || 0), 0);
  const totalPurchases = purchases.reduce((s, p) => s + Number(p.grandTotal || 0), 0);
  const grossProfit = totalSales - totalPurchases;

  const match5574 = Math.abs(generalOpsTotal - 5574155) < 50000;
  const match31854 = Math.abs(linkedOpsTotal - 31854596) < 50000;
  const match37428 = Math.abs(totalExpenses - 37428751) < 50000;

  if (match5574 || match31854 || match37428) {
    console.log(`\n★★★ PERIODE COCOK: ${label} ★★★`);
    console.log(`  Total Penjualan  : Rp ${totalSales.toLocaleString('id-ID')}`);
    console.log(`  Total Pembelian  : Rp ${totalPurchases.toLocaleString('id-ID')}`);
    console.log(`  Gross Profit     : Rp ${grossProfit.toLocaleString('id-ID')}`);
    console.log(`  Ops Kirim & Muat : Rp ${linkedOpsTotal.toLocaleString('id-ID')} (linked)`);
    console.log(`  Ops (General)    : Rp ${generalOpsTotal.toLocaleString('id-ID')} (unlinked)`);
    console.log(`  TOTAL OPS        : Rp ${totalExpenses.toLocaleString('id-ID')}`);
    
    console.log(`\n  RINCIAN OPS GENERAL (${generalOpsExpenses.length} transaksi):`);
    let cumulative = 0;
    generalOpsExpenses.forEach((o, i) => {
      const tgl = new Date(o.date).toLocaleDateString('id-ID');
      const amt = Math.abs(Number(o.amount || 0));
      cumulative += amt;
      console.log(`  ${String(i+1).padStart(3)}. ${tgl} | No: ${o.referenceNumber || '-'} | ${(o.description||'-').substring(0,55)} | ${o.bank||'-'} | Rp ${amt.toLocaleString('id-ID')}`);
    });
    console.log(`  ──────────────────────────────────────────────────────`);
    console.log(`  TOTAL: Rp ${cumulative.toLocaleString('id-ID')}`);
  } else {
    console.log(`[${label}] Ops General: Rp ${generalOpsTotal.toLocaleString('id-ID')} | Ops Linked: Rp ${linkedOpsTotal.toLocaleString('id-ID')} | Total OPS: Rp ${totalExpenses.toLocaleString('id-ID')}`);
  }
}

async function main() {
  // Coba berbagai periode — mingguan, 2-mingguan, dan bulanan
  const periods = [];
  
  // Minggu-minggu (mundur 16 minggu dari sekarang)
  const now = new Date('2026-07-24T00:00:00+07:00');
  for (let w = 0; w < 16; w++) {
    const end = new Date(now);
    end.setDate(end.getDate() - w * 7);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    periods.push({ start, end, label: `Minggu ${start.toLocaleDateString('id-ID')} - ${end.toLocaleDateString('id-ID')}` });
  }
  
  // Bulan-bulan (6 bulan terakhir)
  for (let m = 0; m < 7; m++) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - m);
    const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    periods.push({ start, end, label: `Bulan ${start.toLocaleDateString('id-ID', {month:'long', year:'numeric'})}` });
  }
  
  for (const p of periods) {
    await calcForPeriod(p.start, p.end, p.label);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
