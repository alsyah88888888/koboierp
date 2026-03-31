
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function reprocess() {
    console.log('Starting data repair to create missing journals...');

    // 1. Reprocess Purchase (GoodsReceipt) -> Accrual Hutang (201)
    const receipts = await prisma.goodsReceipt.findMany({
        include: { items: true }
    });

    const invAccount = await prisma.financeAccount.findUnique({ where: { code: '104' } });
    const apAccount = await prisma.financeAccount.findUnique({ where: { code: '201' } });

    if (invAccount && apAccount) {
        for (const r of receipts) {
            // Check if already has journals
            const existing = await prisma.journalEntry.findFirst({
                where: { description: { contains: r.receiptNumber } }
            });

            if (!existing) {
                const total = r.items.reduce((s, i) => s + (i.quantity * Number(i.purchasePrice)), 0);
                if (total > 0) {
                    await prisma.journalEntry.create({
                        data: {
                            description: `Persediaan (Hutang): ${r.receiptNumber} (${r.receivedFrom})`,
                            amount: total,
                            type: "DEBIT",
                            accountId: invAccount.id,
                            date: r.date || r.createdAt
                        }
                    });
                    await prisma.journalEntry.create({
                        data: {
                            description: `Hutang Pembelian: ${r.receiptNumber} (${r.receivedFrom})`,
                            amount: total,
                            type: "CREDIT",
                            accountId: apAccount.id,
                            date: r.date || r.createdAt
                        }
                    });
                    console.log(`Reprocessed Purchase: ${r.receiptNumber}`);
                }
            }
        }
    }

    // 2. Reprocess Sales (SalesDelivery) -> Accrual Piutang (105)
    const sales = await prisma.salesDelivery.findMany({
        include: { items: true }
    });

    const arAccount = await prisma.financeAccount.findUnique({ where: { code: '105' } });
    const revenueAccount = await prisma.financeAccount.findUnique({ where: { code: '401' } });

    if (arAccount && revenueAccount) {
        for (const s of sales) {
            const existing = await prisma.journalEntry.findFirst({
                where: { description: { contains: s.deliveryNumber } }
            });

            if (!existing) {
                const total = s.items.reduce((sum, i) => sum + (i.quantity * Number(i.salesPrice)), 0);
                if (total > 0) {
                    await prisma.journalEntry.create({
                        data: {
                            description: `Piutang Penjualan: ${s.deliveryNumber} (${s.buyerName})`,
                            amount: total,
                            type: "DEBIT",
                            accountId: arAccount.id,
                            date: s.createdAt
                        }
                    });
                    await prisma.journalEntry.create({
                        data: {
                            description: `Pendapatan Penjualan: ${s.deliveryNumber} (${s.buyerName})`,
                            amount: total,
                            type: "CREDIT",
                            accountId: revenueAccount.id,
                            date: s.createdAt
                        }
                    });
                    console.log(`Reprocessed Sale: ${s.deliveryNumber}`);
                }
            }
        }
    }

    console.log('Repair completed.');
}

reprocess().catch(console.error).finally(() => prisma.$disconnect());
