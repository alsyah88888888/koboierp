const { getPrisma } = require("../src/lib/prisma");

async function checkNonSJ() {
    const prisma = getPrisma();
    const deliveries = await prisma.salesDelivery.findMany({
        where: {
            NOT: {
                deliveryNumber: { startsWith: "SJ-" }
            }
        }
    });

    console.log(`Deliveries not starting with SJ-: ${deliveries.length}`);
    deliveries.forEach(d => {
        console.log({
            id: d.id,
            deliveryNumber: d.deliveryNumber,
            invoiceNumber: d.invoiceNumber,
            buyerName: d.buyerName,
            isVoid: d.isVoid,
            createdAt: d.createdAt,
            date: d.date
        });
    });
}

checkNonSJ().catch(console.error);
