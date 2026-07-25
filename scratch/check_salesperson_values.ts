import { getPrisma } from '@/lib/prisma';

async function main() {
  const prisma = getPrisma();
  const startDate = new Date(2026, 5, 1);
  const endDate = new Date(2026, 6, 0, 23, 59, 59, 999);

  const rows = await (prisma as any).salesDelivery.groupBy({
    by: ['salesPerson'],
    where: { isVoid: false, date: { gte: startDate, lte: endDate } },
    _count: { salesPerson: true },
  });
  console.log('Distinct salesPerson pada SalesDelivery Juni 2026:');
  rows.forEach((r: any) => console.log(` "${r.salesPerson}" -> ${r._count.salesPerson} SJ`));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
