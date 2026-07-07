import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const deliveries = await prisma.salesDelivery.findMany({
        where: { OR: [
            { deliveryNumber: { in: ["KB-TRD-11062026-002", "KB-TRD-11062026-003"] } },
            { invoiceNumber: { in: ["KB-TRD-11062026-002", "KB-TRD-11062026-003"] } }
        ] },
        include: { items: true }
    });
    
    for (const d of deliveries) {
        const qty = d.items.reduce((sum, item) => sum + item.quantity, 0);
        console.log(`Delivery: ${d.deliveryNumber}, Invoice: ${d.invoiceNumber}, Qty: ${qty}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
