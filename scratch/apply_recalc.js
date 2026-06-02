const { getPrisma } = require("../src/lib/prisma");

async function applyRecalc() {
    const prisma = getPrisma();
    console.log("=== START DATABASE RECALCULATION & MIGRATION ===");

    // 1. Recalculate SalesDeliveries
    const deliveries = await prisma.salesDelivery.findMany({
        where: { isVoid: false }
    });

    let sdUpdatedCount = 0;
    console.log(`Scanning ${deliveries.length} deliveries...`);
    for (const d of deliveries) {
        const dpp = Number(d.subtotal) - Number(d.totalDiscount);
        const taxAmount = Number(d.taxAmount);
        const exactTotal = dpp + taxAmount;
        const newGrandTotal = Math.ceil(exactTotal / 100) * 100;
        const oldGrandTotal = Number(d.grandTotal);

        if (newGrandTotal !== oldGrandTotal) {
            let updateData = {
                grandTotal: newGrandTotal
            };

            // If fully paid, make sure paidAmount equals the new grandTotal to avoid unpaid balance
            const oldPaid = Number(d.paidAmount || 0);
            if (d.paymentStatus === "PAID" || Math.abs(oldPaid - oldGrandTotal) < 1) {
                updateData.paidAmount = newGrandTotal;
            }

            await prisma.salesDelivery.update({
                where: { id: d.id },
                data: updateData
            });
            sdUpdatedCount++;
            if (sdUpdatedCount % 20 === 0) {
                console.log(`  -> Updated ${sdUpdatedCount} deliveries...`);
            }
        }
    }
    console.log(`Total SalesDelivery records updated: ${sdUpdatedCount}`);

    // 2. Recalculate SalesOrders
    const orders = await prisma.salesOrder.findMany({
        where: { status: { not: "VOID" } }
    });

    let soUpdatedCount = 0;
    console.log(`Scanning ${orders.length} orders...`);
    for (const o of orders) {
        const dpp = Number(o.subtotal) - Number(o.totalDiscount);
        const taxAmount = Number(o.taxAmount);
        const exactTotal = dpp + taxAmount;
        const newGrandTotal = Math.ceil(exactTotal / 100) * 100;
        const oldGrandTotal = Number(o.grandTotal);

        if (newGrandTotal !== oldGrandTotal) {
            await prisma.salesOrder.update({
                where: { id: o.id },
                data: {
                    grandTotal: newGrandTotal
                }
            });
            soUpdatedCount++;
            if (soUpdatedCount % 20 === 0) {
                console.log(`  -> Updated ${soUpdatedCount} orders...`);
            }
        }
    }
    console.log(`Total SalesOrder records updated: ${soUpdatedCount}`);
    console.log("=== MIGRATION COMPLETE ===");
}

applyRecalc().catch(console.error);
