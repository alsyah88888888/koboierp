const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Coba berbagai periode untuk menemukan angka 5.574.155
  const periods = [
    // Minggu ini (Juli 2026)
    { label: 'Minggu 21-27 Jul 2026', start: new Date('2026-07-21T00:00:00+07:00'), end: new Date('2026-07-27T23:59:59+07:00') },
    // Bulan Juli 2026
    { label: 'Bulan Juli 2026', start: new Date('2026-07-01T00:00:00+07:00'), end: new Date('2026-07-31T23:59:59+07:00') },
    // Bulan Juni 2026
    { label: 'Bulan Juni 2026', start: new Date('2026-06-01T00:00:00+07:00'), end: new Date('2026-06-30T23:59:59+07:00') },
    // Semua data (tanpa filter tanggal)
    { label: 'SEMUA PERIODE', start: null, end: null },
  ];

  for (const period of periods) {
    const whereClause = {
      category: 'OPERASIONAL',
      OR: [{ invoiceNumber: null }, { invoiceNumber: '' }],
      AND: [{ OR: [{ transactionType: 'PAYMENT' }, { transactionType: 'EXPENSE' }, { amount: { lt: 0 } }] }],
      ...(period.start ? { date: { gte: period.start, lte: period.end } } : {})
    };

    const txns = await prisma.financeTransaction.findMany({
      where: whereClause,
      orderBy: { date: 'asc' }
    });

    const total = txns.reduce((s, o) => s + Math.abs(Number(o.amount || 0)), 0);
    console.log(`\n[${period.label}] Total Ops (unlinked): Rp ${total.toLocaleString('id-ID')} | ${txns.length} transaksi`);

    if (Math.abs(total - 5574155) < 100 || Math.abs(total - 5574155) < 1000) {
      console.log('  *** COCOK DENGAN 5.574.155! ***');
      txns.forEach((o, i) => {
        const tgl = new Date(o.date).toLocaleDateString('id-ID');
        console.log(`  ${i+1}. ${tgl} | ${(o.description||'-').substring(0,60)} | ${o.bank||'-'} | Rp ${Math.abs(Number(o.amount)).toLocaleString('id-ID')}`);
      });
    }
  }

  // Cari semua transaksi operasional unlinked dan tampilkan semuanya dengan running total
  console.log('\n\n══════════════════════════════════════════════════════════════');
  console.log('SEMUA TRANSAKSI OPERASIONAL UNLINKED (tanpa referensi SJ):');
  console.log('══════════════════════════════════════════════════════════════');
  
  const allUnlinked = await prisma.financeTransaction.findMany({
    where: {
      category: 'OPERASIONAL',
      OR: [{ invoiceNumber: null }, { invoiceNumber: '' }],
      AND: [{ OR: [{ transactionType: 'PAYMENT' }, { transactionType: 'EXPENSE' }, { amount: { lt: 0 } }] }]
    },
    orderBy: { date: 'desc' }
  });

  const totalAll = allUnlinked.reduce((s, o) => s + Math.abs(Number(o.amount || 0)), 0);
  console.log(`Total semua: Rp ${totalAll.toLocaleString('id-ID')} | ${allUnlinked.length} transaksi\n`);
  
  allUnlinked.forEach((o, i) => {
    const tgl = new Date(o.date).toLocaleDateString('id-ID');
    console.log(`${i+1}. ${tgl} | ${(o.description||'-').substring(0,70)} | ${o.bank||'-'} | Rp ${Math.abs(Number(o.amount)).toLocaleString('id-ID')}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
