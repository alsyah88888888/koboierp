const { getPrisma } = require("../src/lib/prisma");

async function run() {
    const prisma = getPrisma();
    const startDate = new Date(2026, 5, 1);
    const endDate = new Date(2026, 6, 0, 23, 59, 59, 999);

    const deliveries = await prisma.salesDelivery.findMany({
        where: {
            date: { gte: startDate, lte: endDate },
            isVoid: false
        }
    });

    let sumSubtotal = 0;
    let sumDiscount = 0;
    let sumTax = 0;
    let sumGrand = 0;

    deliveries.forEach(d => {
        sumSubtotal += Number(d.subtotal);
        sumDiscount += Number(d.totalDiscount);
        sumTax += Number(d.taxAmount);
        sumGrand += Number(d.grandTotal);
        console.log(`${d.deliveryNumber}: Subtotal=${d.subtotal.toString()}, Discount=${d.totalDiscount.toString()}, Tax=${d.taxAmount.toString()}, GrandTotal=${d.grandTotal.toString()}`);
    });

    console.log("-----------------------------------------");
    console.log("Calculated Sums (Number):");
    console.log("Sum Subtotal:", sumSubtotal);
    console.log("Sum Discount:", sumDiscount);
    console.log("Sum Tax:", sumTax);
    console.log("Sum Grand:", sumGrand);
    console.log("Sum Subtotal - Discount + Tax:", sumSubtotal - sumDiscount + sumTax);
}

run().catch(console.error);
