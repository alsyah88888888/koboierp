import { getPrisma } from '@/lib/prisma';

const CODE = 'KB-TRN-12052026-008';

async function main() {
  const prisma = getPrisma();

  const salesDeliveries = await (prisma as any).salesDelivery.findMany({
    where: { OR: [{ invoiceNumber: CODE }, { deliveryNumber: CODE }] },
    select: { deliveryNumber: true, invoiceNumber: true, date: true, salesPerson: true, buyerName: true, isVoid: true, poNumber: true, orderId: true },
  });
  console.log('=== SalesDelivery (invoiceNumber atau deliveryNumber persis) ===');
  console.log(JSON.stringify(salesDeliveries, null, 2));

  const salesOrders = await (prisma as any).salesOrder.findMany({
    where: { OR: [{ orderNumber: CODE }, { proformaNumber: CODE }, { invoiceNumber: CODE }, { poNumber: CODE }] },
    select: { orderNumber: true, proformaNumber: true, invoiceNumber: true, poNumber: true, date: true, buyerName: true },
  });
  console.log('\n=== SalesOrder ===');
  console.log(JSON.stringify(salesOrders, null, 2));

  const financeTxns = await (prisma as any).financeTransaction.findMany({
    where: { OR: [{ referenceNumber: { contains: CODE } }, { invoiceNumber: { contains: CODE } }, { description: { contains: CODE } }] },
    select: { date: true, bank: true, amount: true, category: true, salesPerson: true, referenceNumber: true, invoiceNumber: true, description: true },
  });
  console.log('\n=== FinanceTransaction (referenceNumber/invoiceNumber/description contains) ===');
  console.log(JSON.stringify(financeTxns, null, 2));

  const goodsReceipts = await (prisma as any).goodsReceipt.findMany({
    where: { OR: [{ receiptNumber: CODE }, { formNumber: CODE }, { taxInvoiceNumber: CODE }] },
    select: { receiptNumber: true, formNumber: true, date: true, receivedFrom: true },
  }).catch(() => []);
  console.log('\n=== GoodsReceipt ===');
  console.log(JSON.stringify(goodsReceipts, null, 2));

  const salesReturns = await (prisma as any).salesReturn.findMany({
    where: { returnNumber: CODE },
    select: { returnNumber: true, date: true },
  }).catch(() => []);
  console.log('\n=== SalesReturn ===');
  console.log(JSON.stringify(salesReturns, null, 2));

  const bankMutations = await (prisma as any).bankMutation.findMany({
    where: { description: { contains: CODE } },
    select: { description: true, date: true, amount: true },
  }).catch((e: any) => { console.log('bankMutation err', e.message); return []; });
  console.log('\n=== BankMutation ===');
  console.log(JSON.stringify(bankMutations, null, 2));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
