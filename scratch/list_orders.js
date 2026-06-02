import { getPrisma } from "../src/lib/prisma";

async function run() {
    const prisma = getPrisma();
    const orders = await prisma.salesOrder.findMany({
        select: {
            id: true,
            orderNumber: true,
            proformaNumber: true,
            invoiceNumber: true,
            status: true,
            createdAt: true
        },
        orderBy: { createdAt: "desc" },
        take: 20
    });
    console.log(JSON.stringify(orders, null, 2));
}

run().catch(console.error);
