import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const deliveries = await prisma.salesDelivery.findMany({
        where: { invoiceNumber: { contains: "KB-TRD-11062026-00" } },
        include: { items: true, order: true }
    });
    
    for (const d of deliveries) {
        const qty = d.items.reduce((sum, item) => sum + item.quantity, 0);
        console.log(`Invoice: ${d.invoiceNumber}, Delivery: ${d.deliveryNumber}, Buyer: ${d.buyerName}, Qty: ${qty}`);
    }

    const tx = await prisma.financeTransaction.findMany({
        where: { invoiceNumber: { contains: "KB-TRD-11062026-00" } },
        select: { id: true, amount: true, description: true, invoiceNumber: true }
    });
    console.log("\nFinance Transactions:");
    console.table(tx);
}

main().catch(console.error).finally(() => prisma.$disconnect());
