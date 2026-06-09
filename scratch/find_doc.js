const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const query = "KB-TRN-05062026-003";
  console.log(`Searching for document/transaction: ${query}`);

  // GoodsReceipt
  const gr = await prisma.goodsReceipt.findFirst({
    where: {
      OR: [
        { receiptNumber: { contains: query } },
        { formNumber: { contains: query } },
        { taxInvoiceNumber: { contains: query } }
      ]
    },
    include: { items: { include: { product: true } } }
  });
  if (gr) console.log("Found in GoodsReceipt:", JSON.stringify(gr, null, 2));

  // SalesDelivery
  const sd = await prisma.salesDelivery.findFirst({
    where: {
      OR: [
        { deliveryNumber: { contains: query } },
        { poNumber: { contains: query } }
      ]
    },
    include: { items: { include: { product: true } } }
  });
  if (sd) console.log("Found in SalesDelivery:", JSON.stringify(sd, null, 2));

  // PurchaseOrder
  const po = await prisma.purchaseOrder.findFirst({
    where: { number: { contains: query } },
    include: { items: { include: { product: true } } }
  });
  if (po) console.log("Found in PurchaseOrder:", JSON.stringify(po, null, 2));

  // PurchaseRequest
  const pr = await prisma.purchaseRequest.findFirst({
    where: { number: { contains: query } },
    include: { items: true }
  });
  if (pr) console.log("Found in PurchaseRequest:", JSON.stringify(pr, null, 2));

  // FinanceTransaction
  const ft = await prisma.financeTransaction.findFirst({
    where: {
      OR: [
        { referenceNumber: { contains: query } },
        { invoiceNumber: { contains: query } },
        { receiptNumber: { contains: query } }
      ]
    }
  });
  if (ft) console.log("Found in FinanceTransaction:", JSON.stringify(ft, null, 2));

  // StockMovement
  const sm = await prisma.stockMovement.findMany({
    where: { reference: { contains: query } },
    include: { product: true }
  });
  if (sm.length > 0) console.log("Found in StockMovement:", JSON.stringify(sm, null, 2));

  // JournalEntry
  const je = await prisma.journalEntry.findMany({
    where: { description: { contains: query } },
    include: { account: true }
  });
  if (je.length > 0) console.log("Found in JournalEntry:", JSON.stringify(je, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
