import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const inv = 'KB-TRN-02072026-005';
    const delivery = await prisma.salesDelivery.findFirst({
        where: { invoiceNumber: inv },
        include: { items: { include: { product: true } } }
    });

    if (!delivery) {
        console.log(`Invoice ${inv} not found.`);
        return;
    }

    console.log(`Invoice: ${delivery.invoiceNumber}`);
    console.log(`Date: ${delivery.date}`);
    console.log(`Discount: ${delivery.discount}`);
    console.log(`Tax: ${delivery.tax}`);
    console.log(`Grand Total: ${delivery.grandTotal}`);

    console.log("\nItems:");
    delivery.items.forEach((item: any) => {
        console.log(`- ${item.product.name} | Qty: ${item.quantity} | Price: ${item.price} | Total: ${item.totalPrice}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
