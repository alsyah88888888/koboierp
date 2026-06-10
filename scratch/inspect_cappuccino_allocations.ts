import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    const product = await prisma.product.findFirst({
        where: { name: { contains: "Nescafe Coffee Ready To Drink Cappuccino", mode: 'insensitive' } }
    });
    if (!product) return;

    const allocations = await prisma.lotAllocation.findMany({
        where: {
            sdItem: {
                productId: product.id
            }
        },
        include: {
            lot: true,
            sdItem: {
                include: {
                    delivery: true
                }
            }
        }
    });

    console.log("=== LOT ALLOCATIONS ===");
    for (const a of allocations) {
        console.log(`ID: ${a.id} | Qty: ${a.qty} | HPP: ${a.hppAtTime}`);
        console.log(`  SD Item: ${a.sdItemId} | Delivery: ${a.sdItem.delivery.deliveryNumber} | Invoice: ${a.sdItem.delivery.invoiceNumber}`);
        console.log(`  Lot: ${a.lotId} | Lot Number: ${a.lot.lotNumber} | GR: ${a.lot.grNumber} | Purchase Price: ${a.lot.purchasePrice}`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
