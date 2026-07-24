const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Berdasarkan kode di report-service:
  // generalOps = totalExpenses - linkedOpsExpense
  // Di mana:
  //   totalExpenses = sum dari dailyBreakdown[].opsExpense
  //   linkedOpsExpense = sum dari weeklyTraceability[]['OPS']
  //
  // Dan di tiap hari:
  //   generalOps (per hari) = dayOps yang transactionType=PAYMENT/EXPENSE/amount<0 DAN !invoiceNumber
  //   linked (per hari)     = dari kolom OPS di traceability SJ hari itu
  //
  // Jadi kita perlu cek: apakah ada minggu/bulan di mana angka 
  // TOTAL BIAYA OPERASIONAL = 37.428.751 dan Ops Kirim = 31.854.596
  // maka generalOps = 37.428.751 - 31.854.596 = 5.574.155

  // Cek berbagai periode mingguan yang kemungkinan menghasilkan total expenses 37.428.751
  // Coba 5 minggu terakhir
  const endDate = new Date('2026-07-24T23:59:59+07:00');
  
  for (let weekOffset = 0; weekOffset < 8; weekOffset++) {
    const end = new Date(endDate);
    end.setDate(end.getDate() - (weekOffset * 7));
    end.setHours(23, 59, 59, 999);
    
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    
    // Ambil sales dalam periode
    const sales = await prisma.salesDelivery.findMany({
      where: { isVoid: false, date: { gte: start, lte: end } },
      select: { invoiceNumber: true, deliveryNumber: true, grandTotal: true }
    });
    const deliveryInvoices = [...new Set(sales.map(s => s.invoiceNumber || s.deliveryNumber).filter(Boolean))];
    const totalSales = sales.reduce((s, d) => s + Number(d.grandTotal || 0), 0);

    // Ambil purchases dalam periode
    const purchases = await prisma.goodsReceipt.findMany({
      where: { isVoid: false, date: { gte: start, lte: end } },
      select: { grandTotal: true }
    });
    const totalPurchases = purchases.reduce((s, p) => s + Number(p.grandTotal || 0), 0);

    // Ambil semua operasional (unlinked)
    const unlinkedOps = await prisma.financeTransaction.findMany({
      where: {
        date: { gte: start, lte: end },
        category: 'OPERASIONAL',
        OR: [{ invoiceNumber: null }, { invoiceNumber: '' }]
      }
    });

    // Ambil linked ops
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

    const generalOpsTotal = unlinkedOps
      .filter(o => o.transactionType === 'PAYMENT' || o.transactionType === 'EXPENSE' || Number(o.amount) < 0)
      .reduce((s, o) => s + Math.abs(Number(o.amount || 0)), 0);

    const linkedOpsTotal = linkedOps
      .filter(o => o.transactionType === 'PAYMENT' || o.transactionType === 'EXPENSE' || Number(o.amount) < 0)
      .reduce((s, o) => s + Math.abs(Number(o.amount || 0)), 0);

    const totalExpenses = generalOpsTotal + linkedOpsTotal;

    const label = `${start.toLocaleDateString('id-ID')} - ${end.toLocaleDateString('id-ID')}`;
    console.log(`[${label}]`);
    console.log(`  Total Penjualan : Rp ${totalSales.toLocaleString('id-ID')}`);
    console.log(`  Total Pembelian : Rp ${totalPurchases.toLocaleString('id-ID')}`);
    console.log(`  Ops Kirim Muat  : Rp ${linkedOpsTotal.toLocaleString('id-ID')}`);
    console.log(`  Ops (General)   : Rp ${generalOpsTotal.toLocaleString('id-ID')}`);
    console.log(`  TOTAL OPS       : Rp ${totalExpenses.toLocaleString('id-ID')}`);
    
    if (Math.abs(totalExpenses - 37428751) < 5000 || Math.abs(generalOpsTotal - 5574155) < 5000) {
      console.log(`  *** COCOK! ***`);
      console.log(`  --- Detail Ops General (${unlinkedOps.length} transaksi) ---`);
      unlinkedOps
        .filter(o => o.transactionType === 'PAYMENT' || o.transactionType === 'EXPENSE' || Number(o.amount) < 0)
        .forEach((o, i) => {
          const tgl = new Date(o.date).toLocaleDateString('id-ID');
          console.log(`    ${i+1}. ${tgl} | ${(o.description||'-').substring(0,60)} | ${o.bank||'-'} | Rp ${Math.abs(Number(o.amount)).toLocaleString('id-ID')}`);
        });
    }
    console.log('');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
