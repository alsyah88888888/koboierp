import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    console.log("=== INSPECTING NESCAFE COFFEE READY TO DRINK CAPPUCCINO 220ML ===");
    
    // 1. Find the product
    const product = await prisma.product.findFirst({
        where: {
            name: {
                contains: "Nescafe Coffee Ready To Drink Cappuccino",
                mode: 'insensitive'
            }
        }
    });
    
    if (!product) {
        console.log("Product not found!");
        return;
    }
    console.log(`Product Found: ${product.name} (ID: ${product.id}, SKU: ${product.sku})`);
    
    // 2. Find all ProductLots for this product
    const lots = await prisma.productLot.findMany({
        where: { productId: product.id },
        orderBy: { grDate: 'asc' }
    });
    console.log("\n--- PRODUCT LOTS ---");
    for (const lot of lots) {
        console.log(`Lot: ${lot.lotNumber} | GR: ${lot.grNumber} | Date: ${lot.grDate.toISOString()} | Qty Initial/Remaining: ${lot.initialQty}/${lot.remainingQty} | Price: ${lot.purchasePrice}`);
    }
    
    // 3. Find Sales Delivery items for this product
    const sdItems = await prisma.salesDeliveryItem.findMany({
        where: { productId: product.id },
        include: {
            delivery: true,
            lotAllocations: {
                include: { lot: true }
            }
        }
    });
    
    console.log("\n--- SALES DELIVERY ITEMS & LOT ALLOCATIONS ---");
    for (const item of sdItems) {
        console.log(`Delivery: ${item.delivery.deliveryNumber} | Date: ${item.delivery.date.toISOString()} | Qty Sold: ${item.quantity} | Invoice: ${item.delivery.invoiceNumber}`);
        if (item.lotAllocations.length > 0) {
            for (const alloc of item.lotAllocations) {
                console.log(`  -> Allocated Lot: ${alloc.lot.lotNumber} (GR: ${alloc.lot.grNumber}) | Qty: ${alloc.qty} | HPP: ${alloc.hppAtTime}`);
            }
        } else {
            console.log("  -> NO LOT ALLOCATION IN DATABASE");
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
