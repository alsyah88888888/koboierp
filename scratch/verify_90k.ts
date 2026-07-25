import { getPrisma } from '@/lib/prisma';

async function main() {
  const prisma = getPrisma();

  const txn = await (prisma as any).financeTransaction.findFirst({
    where: { description: { contains: 'KB-PR-20260604-003' } },
  });
  console.log('=== FinanceTransaction PR-20260604-003 ===');
  console.log(JSON.stringify(txn, null, 2));

  const invNumbers = (txn.invoiceNumber as string).split(',').map((s: string) => s.trim());
  const deliveries = await (prisma as any).salesDelivery.findMany({
    where: { OR: [{ invoiceNumber: { in: invNumbers } }, { deliveryNumber: { in: invNumbers } }] },
    include: { items: { select: { quantity: true } } },
  });
  console.log('\n=== Sales Deliveries terkait (dua-duanya) ===');
  deliveries.forEach((d: any) => {
    const qty = d.items.reduce((s: number, i: any) => s + Number(i.quantity || 0), 0);
    console.log({ deliveryNumber: d.deliveryNumber, invoiceNumber: d.invoiceNumber, date: d.date, salesPerson: d.salesPerson, buyerName: d.buyerName, totalQty: qty });
  });
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
