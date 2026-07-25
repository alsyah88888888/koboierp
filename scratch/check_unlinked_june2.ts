import { getPrisma } from '@/lib/prisma';
import { fetchHybridOperationalData, distributeOperationalCosts } from '@/lib/services/report-service';

async function run(prefix: 'PF' | 'BC') {
  const prisma = getPrisma();
  const startDate = new Date(2026, 5, 1);
  const endDate = new Date(2026, 6, 0, 23, 59, 59, 999);

  const sales = await (prisma as any).salesDelivery.findMany({
    where: { isVoid: false, date: { gte: startDate, lte: endDate } },
    select: { invoiceNumber: true, deliveryNumber: true },
  });
  const deliveryInvoices: string[] = sales.map((s: any) => s.invoiceNumber || s.deliveryNumber).filter(Boolean);

  const rawOperational = await fetchHybridOperationalData(prisma, startDate, endDate, deliveryInvoices);
  const allOperational = await distributeOperationalCosts(rawOperational, prefix);

  const linked = allOperational.filter((o: any) => !!o.invoiceNumber);
  const unlinked = allOperational.filter((o: any) => !o.invoiceNumber);
  const linkedTotal = linked.reduce((s: number, o: any) => s + Number(o.amount || 0), 0);
  const unlinkedTotal = unlinked.reduce((s: number, o: any) => s + Number(o.amount || 0), 0);
  const grandTotal = allOperational.reduce((s: number, o: any) => s + Number(o.amount || 0), 0);

  console.log(`\n## ${prefix}: total rows=${allOperational.length} | linked rows=${linked.length} (Rp${linkedTotal}) | unlinked rows=${unlinked.length} (Rp${unlinkedTotal}) | grand total=Rp${grandTotal}`);
}

async function main() {
  await run('PF');
  await run('BC');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
