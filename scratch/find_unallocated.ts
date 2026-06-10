import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    console.log("=== SCANNING UNALLOCATED SALES DELIVERY ITEMS ===");
    
    const unallocated = await prisma.salesDeliveryItem.findMany({
        where: {
            lotAllocations: {
                none: {}
            },
            delivery: {
                isVoid: false
            }
        },
        include: {
            delivery: true,
            product: true
        },
        orderBy: {
            delivery: {
                date: 'asc'
            }
        }
    });
    
    console.log(`Found ${unallocated.length} unallocated sales delivery items.`);
    
    // Print the first 30 for analysis
    for (const item of unallocated.slice(0, 30)) {
        console.log(`SD: ${item.delivery.deliveryNumber} | Date: ${item.delivery.date.toISOString()} | Product: ${item.product.name} (SKU: ${item.product.sku}) | Qty: ${item.quantity} | Buyer: ${item.delivery.buyerName || item.delivery.recipient}`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
