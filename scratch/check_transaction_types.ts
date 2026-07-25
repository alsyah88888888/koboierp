import { getPrisma } from '@/lib/prisma';

async function main() {
  const prisma = getPrisma();
  const startDate = new Date(2026, 5, 1);
  const endDate = new Date(2026, 6, 0, 23, 59, 59, 999);

  const juneSales = await (prisma as any).salesDelivery.findMany({
    where: { isVoid: false, date: { gte: startDate, lte: endDate } },
    select: { invoiceNumber: true, deliveryNumber: true },
  });
  const deliveryInvoices: string[] = juneSales.map((s: any) => s.invoiceNumber || s.deliveryNumber).filter(Boolean);

  const linkedOps = await (prisma as any).financeTransaction.findMany({
    where: {
      OR: deliveryInvoices.map((inv: string) => ({ invoiceNumber: { contains: inv } })),
      category: { notIn: ['PEMBELIAN', 'PENJUALAN', 'TRANSFER'] },
    },
    select: { id: true, date: true, amount: true, transactionType: true, invoiceNumber: true, salesPerson: true, description: true },
  });

  const byType = new Map<string, { count: number; total: number }>();
  const nonPaymentSamples: any[] = [];
  for (const op of linkedOps) {
    const t = op.transactionType || '(null)';
    if (!byType.has(t)) byType.set(t, { count: 0, total: 0 });
    const rec = byType.get(t)!;
    rec.count++;
    rec.total += Number(op.amount || 0);
    if (t !== 'PAYMENT' && t !== 'EXPENSE' && nonPaymentSamples.length < 20) nonPaymentSamples.push(op);
  }

  console.log('Distribusi transactionType pada linked ops Juni:');
  for (const [t, rec] of byType) console.log(' ', t, '| count:', rec.count, '| total amount:', rec.total);

  console.log('\nContoh transaksi linked dengan transactionType SELAIN PAYMENT/EXPENSE:');
  nonPaymentSamples.forEach(o => console.log(o.date, '|', o.transactionType, '|', o.amount, '|', o.salesPerson, '|', o.invoiceNumber, '|', (o.description || '').slice(0, 70)));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
