import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    console.log("=== INSPECTING KECAP BANGO 25GR & 77GR ===");
    
    const products = await prisma.product.findMany({
        where: {
            name: {
                in: ["Kecap Bango 25Gr", "Kecap Bango 77Gr"]
            }
        }
    });
    
    for (const p of products) {
        console.log(`\n=========================================`);
        console.log(`Product: ${p.name} (ID: ${p.id}, SKU: ${p.sku})`);
        
        // Lots
        const lots = await prisma.productLot.findMany({
            where: { productId: p.id },
            orderBy: { grDate: 'asc' }
        });
        console.log("--- LOTS ---");
        for (const lot of lots) {
            console.log(`  Lot: ${lot.lotNumber} | GR: ${lot.grNumber} | Date: ${lot.grDate.toISOString()} | Initial/Remaining: ${lot.initialQty}/${lot.remainingQty} | Supplier: ${lot.supplierName} | Price: ${lot.purchasePrice}`);
        }
        
        // Sales Deliveries
        const sdItems = await prisma.salesDeliveryItem.findMany({
            where: { productId: p.id },
            include: {
                delivery: true,
                lotAllocations: { include: { lot: true } }
            },
            orderBy: { delivery: { date: 'asc' } }
        });
        console.log("--- SALES DELIVERIES ---");
        for (const item of sdItems) {
            console.log(`  SD: ${item.delivery.deliveryNumber} | Date: ${item.delivery.date.toISOString()} | Qty: ${item.quantity} | Buyer: ${item.delivery.buyerName || item.delivery.recipient} | Invoice: ${item.delivery.invoiceNumber}`);
            if (item.lotAllocations.length > 0) {
                for (const a of item.lotAllocations) {
                    console.log(`    -> Allocated: ${a.lot.lotNumber} (GR: ${a.lot.grNumber}) | Qty: ${a.qty}`);
                }
            } else {
                console.log(`    -> NO ALLOCATION IN DATABASE`);
            }
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
