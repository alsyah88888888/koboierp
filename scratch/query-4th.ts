import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // We are looking for a delivery around 11062026 with Qty = 124
    const deliveries = await prisma.salesDelivery.findMany({
        where: { invoiceNumber: { contains: "KB-TRD-11062026" } },
        include: { items: true }
    });
    
    for (const d of deliveries) {
        const qty = d.items.reduce((sum, item) => sum + item.quantity, 0);
        if (qty === 124 || qty === 125 || qty === 123) {
            console.log(`FOUND MISSING INVOICE! Invoice: ${d.invoiceNumber}, Delivery: ${d.deliveryNumber}, Buyer: ${d.buyerName}, Qty: ${qty}`);
        } else {
            console.log(`Invoice: ${d.invoiceNumber}, Buyer: ${d.buyerName}, Qty: ${qty}`);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
