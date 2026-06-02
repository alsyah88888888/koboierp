const { getPrisma } = require("../src/lib/prisma");

async function checkDb() {
    const prisma = getPrisma();
    console.log("=== CHECK DATABASE STUFF ===");

    // Let's get total sales delivery (Revenue) for ALL, or by month
    const allDeliveries = await prisma.salesDelivery.findMany({
        where: { isVoid: false }
    });

    console.log(`Total active deliveries: ${allDeliveries.length}`);
    const sumGrandTotalAll = allDeliveries.reduce((sum, d) => sum + Number(d.grandTotal || 0), 0);
    const sumSubtotalAll = allDeliveries.reduce((sum, d) => sum + Number(d.subtotal || 0), 0);
    console.log(`All-time Grand Total: Rp ${sumGrandTotalAll.toLocaleString('id-ID')}`);
    console.log(`All-time Subtotal: Rp ${sumSubtotalAll.toLocaleString('id-ID')}`);

    // Let's group by month
    const monthlyGroups = {};
    allDeliveries.forEach(d => {
        const date = new Date(d.date || d.createdAt);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyGroups[key]) monthlyGroups[key] = { grand: 0, sub: 0, count: 0 };
        monthlyGroups[key].grand += Number(d.grandTotal || 0);
        monthlyGroups[key].sub += Number(d.subtotal || 0);
        monthlyGroups[key].count++;
    });
    console.log("Monthly Sales Deliveries (non-void):", JSON.stringify(monthlyGroups, null, 2));

    // Let's check Asset Value
    const stocks = await prisma.stock.findMany({
        include: {
            product: {
                select: {
                    purchasePrice: true,
                    receiptItems: {
                        select: { purchasePrice: true },
                        orderBy: { receipt: { date: 'desc' } },
                        take: 1
                    }
                }
            }
        }
    });

    let assetValueLatestPrice = 0;
    let assetValueMasterPrice = 0;
    stocks.forEach(s => {
        const latestPrice = Number(s.product.receiptItems[0]?.purchasePrice || s.product.purchasePrice || 0);
        const masterPrice = Number(s.product.purchasePrice || 0);
        assetValueLatestPrice += s.quantity * latestPrice;
        assetValueMasterPrice += s.quantity * masterPrice;
    });

    console.log(`Asset Value (Latest GR Price): Rp ${assetValueLatestPrice.toLocaleString('id-ID')}`);
    console.log(`Asset Value (Master Price): Rp ${assetValueMasterPrice.toLocaleString('id-ID')}`);

    // Let's check Cash/Bank accounts code startsWith 101/102
    const journals = await prisma.journalEntry.findMany({
        where: {
            account: { OR: [{ code: { startsWith: '101' } }, { code: { startsWith: '102' } }] }
        },
        select: { type: true, amount: true }
    });
    let debit = 0;
    let credit = 0;
    journals.forEach(j => {
        if (j.type === 'DEBIT') debit += Number(j.amount);
        else credit += Number(j.amount);
    });
    console.log(`Cash Balance: Rp ${(debit - credit).toLocaleString('id-ID')} (Debit: Rp ${debit.toLocaleString('id-ID')}, Credit: Rp ${credit.toLocaleString('id-ID')})`);
}

checkDb().catch(console.error);
