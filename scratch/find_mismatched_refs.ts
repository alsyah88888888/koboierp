import { getPrisma } from '@/lib/prisma';

async function main() {
  const prisma = getPrisma();
  const startDate = new Date(2026, 5, 1);
  const endDate = new Date(2026, 6, 0, 23, 59, 59, 999);

  // Deliveries in June (source of deliveryInvoices for the "linked" query, same as report-service does)
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
    select: { id: true, date: true, amount: true, invoiceNumber: true, salesPerson: true, description: true },
  });
  console.log('Total linked ops candidates (June deliveryInvoices match):', linkedOps.length);

  let mismatchCount = 0;
  let mismatchAmount = 0;
  const mismatchSamples: any[] = [];

  for (const op of linkedOps) {
    const invoices = String(op.invoiceNumber || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    let anyMatch = false;
    for (const inv of invoices) {
      const found = await (prisma as any).salesDelivery.count({ where: { OR: [{ invoiceNumber: inv }, { deliveryNumber: inv }] } });
      if (found > 0) { anyMatch = true; break; }
    }
    if (!anyMatch) {
      mismatchCount++;
      mismatchAmount += Number(op.amount || 0);
      if (mismatchSamples.length < 15) mismatchSamples.push(op);
    }
  }

  console.log('Linked ops with ZERO exact SalesDelivery match (fallback path):', mismatchCount, '| Total amount:', mismatchAmount);
  console.log('\nContoh:');
  mismatchSamples.forEach(o => console.log(o.date, '|', o.amount, '|', o.salesPerson, '|', o.invoiceNumber, '|', (o.description || '').slice(0, 80)));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
