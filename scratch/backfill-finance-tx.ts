import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting backfill of FinanceTransactions for existing payments...");

    const receipts = await prisma.goodsReceipt.findMany({
        where: { paidAmount: { gt: 0 } }
    });

    let count = 0;
    for (const r of receipts) {
        const existing = await prisma.financeTransaction.findFirst({
            where: { referenceNumber: r.receiptNumber, transactionType: "EXPENSE" }
        });

        if (!existing) {
            await prisma.financeTransaction.create({
                data: {
                    transactionType: "EXPENSE",
                    bank: "KAS BESAR", // default
                    date: r.updatedAt,
                    referenceNumber: r.receiptNumber,
                    description: `Pembayaran Pembelian ke ${r.receivedFrom}`,
                    amount: r.paidAmount,
                    category: "PEMBELIAN",
                    receiptNumber: r.receiptNumber,
                }
            });
            count++;
        }
    }
    console.log(`Backfilled ${count} Purchase transactions.`);

    const deliveries = await prisma.salesDelivery.findMany({
        where: { paidAmount: { gt: 0 } }
    });

    let countSales = 0;
    for (const d of deliveries) {
        const existing = await prisma.financeTransaction.findFirst({
            where: { referenceNumber: d.deliveryNumber, transactionType: "INCOME" }
        });

        if (!existing) {
            await prisma.financeTransaction.create({
                data: {
                    transactionType: "INCOME",
                    bank: "KAS BESAR", // default
                    date: d.updatedAt,
                    referenceNumber: d.deliveryNumber,
                    description: `Penerimaan Pelunasan Penjualan dari ${d.buyerName}`,
                    amount: d.paidAmount,
                    category: "PENJUALAN",
                    invoiceNumber: d.deliveryNumber,
                }
            });
            countSales++;
        }
    }
    console.log(`Backfilled ${countSales} Sales transactions.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
