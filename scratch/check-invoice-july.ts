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
    console.log(`Discount: ${delivery.discountAmount}`);
    console.log(`Tax: ${delivery.taxAmount}`);
    console.log(`Grand Total: ${delivery.grandTotal}`);

    console.log("\nItems:");
    delivery.items.forEach(item => {
        console.log(`- ${item.product.name} | Qty: ${item.quantity} | Selling Price: ${item.sellingPrice} | Subtotal: ${Number(item.quantity) * Number(item.sellingPrice)}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
