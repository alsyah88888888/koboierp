import { getPrisma } from '@/lib/prisma';

async function main() {
  const prisma = getPrisma();

  const deliveries = await (prisma as any).salesDelivery.findMany({
    where: { invoiceNumber: 'KB-TRN-12052026-008' },
    include: {
      items: { include: { product: { select: { name: true } } } },
      order: { select: { orderNumber: true } },
    },
  });
  console.log('=== Semua SalesDelivery dengan invoiceNumber = KB-TRN-12052026-008 (persis, tanpa filter isVoid) ===');
  console.log(JSON.stringify(deliveries, null, 2));

  // Also check deliveryNumber SJ-444-13052026-007 directly by exact number to see its own invoiceNumber field
  const byDeliveryNumber = await (prisma as any).salesDelivery.findMany({
    where: { deliveryNumber: { contains: 'SJ-444' } },
    select: { id: true, deliveryNumber: true, invoiceNumber: true, date: true, isVoid: true, salesPerson: true, buyerName: true, createdAt: true },
  });
  console.log('\n=== Semua SalesDelivery dengan deliveryNumber mengandung "SJ-444" ===');
  console.log(JSON.stringify(byDeliveryNumber, null, 2));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
