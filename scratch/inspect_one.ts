import { getPrisma } from '@/lib/prisma';

async function main() {
  const prisma = getPrisma();
  const txn = await (prisma as any).financeTransaction.findFirst({
    where: { description: { contains: 'KB-PR-20260601-006' } },
  });
  console.log('=== FinanceTransaction ===');
  console.log(JSON.stringify(txn, null, 2));

  if (txn?.invoiceNumber) {
    const invoices = String(txn.invoiceNumber).split(',').map((s: string) => s.trim()).filter(Boolean);
    for (const inv of invoices) {
      const deliveries = await (prisma as any).salesDelivery.findMany({
        where: { OR: [{ invoiceNumber: inv }, { deliveryNumber: inv }] },
        select: { deliveryNumber: true, invoiceNumber: true, date: true, salesPerson: true, isVoid: true, buyerName: true },
      });
      console.log(`\nDeliveries matching "${inv}":`, JSON.stringify(deliveries, null, 2));
    }
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
