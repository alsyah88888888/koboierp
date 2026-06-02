const { getPrisma } = require("../src/lib/prisma");

async function testRecalc() {
    const prisma = getPrisma();
    console.log("=== SCANNING FOR DISCREPANCIES IN SALES DELIVERIES ===");

    const deliveries = await prisma.salesDelivery.findMany({
        where: { isVoid: false }
    });

    let count = 0;
    for (const d of deliveries) {
        const dpp = Number(d.subtotal) - Number(d.totalDiscount);
        const taxAmount = Number(d.taxAmount);
        const exactTotal = dpp + taxAmount;
        const newGrandTotal = Math.ceil(exactTotal / 100) * 100;
        const oldGrandTotal = Number(d.grandTotal);

        if (newGrandTotal !== oldGrandTotal) {
            count++;
            if (count <= 10) {
                console.log(`SD ${d.deliveryNumber}: Exact=${exactTotal}, Stored=${oldGrandTotal}, New=${newGrandTotal}, Diff=${newGrandTotal - oldGrandTotal}`);
            }
        }
    }
    console.log(`Total SalesDeliveries to update: ${count} / ${deliveries.length}`);

    console.log("\n=== SCANNING FOR DISCREPANCIES IN SALES ORDERS ===");
    const orders = await prisma.salesOrder.findMany({
        where: { status: { not: "VOID" } }
    });

    let orderCount = 0;
    for (const o of orders) {
        const dpp = Number(o.subtotal) - Number(o.totalDiscount);
        const taxAmount = Number(o.taxAmount);
        const exactTotal = dpp + taxAmount;
        const newGrandTotal = Math.ceil(exactTotal / 100) * 100;
        const oldGrandTotal = Number(o.grandTotal);

        if (newGrandTotal !== oldGrandTotal) {
            orderCount++;
            if (orderCount <= 10) {
                console.log(`SO ${o.orderNumber}: Exact=${exactTotal}, Stored=${oldGrandTotal}, New=${newGrandTotal}, Diff=${newGrandTotal - oldGrandTotal}`);
            }
        }
    }
    console.log(`Total SalesOrders to update: ${orderCount} / ${orders.length}`);
}

testRecalc().catch(console.error);
