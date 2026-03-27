
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("--- Investigating Receipt KB-LPB-20260324-001 ---");
    const receipt = await prisma.goodsReceipt.findFirst({
        where: { receiptNumber: 'KB-LPB-20260324-001' },
        include: { 
            items: { include: { product: true } },
            warehouse: true,
            verifications: true
        }
    });

    if (!receipt) {
        console.log("Receipt not found!");
        return;
    }

    console.log(`ID: ${receipt.id}`);
    console.log(`Status: ${receipt.isVerified ? "VERIFIED" : "NOT VERIFIED"}`);
    console.log(`Warehouse: ${receipt.warehouse.name}`);
    console.log(`Items (${receipt.items.length}):`);
    receipt.items.forEach(item => {
        console.log(`- ${item.product.name} (${item.product.sku}): Qty ${item.quantity}`);
    });

    console.log(`Verifications: ${receipt.verifications.length}`);
    
    // Check Stock
    console.log("\n--- Checking Stock for these items ---");
    for (const item of receipt.items) {
        const stock = await prisma.stock.findUnique({
            where: {
                productId_warehouseId_vendorName: {
                    productId: item.productId,
                    warehouseId: receipt.warehouseId,
                    vendorName: receipt.receivedFrom
                }
            }
        });
        console.log(`Product: ${item.product.name}, Stock: ${stock ? stock.quantity : 0}`);
        
        const movements = await prisma.stockMovement.findMany({
            where: {
                productId: item.productId,
                reference: { contains: receipt.receiptNumber }
            }
        });
        console.log(`  Movements: ${movements.length}`);
        movements.forEach(m => console.log(`    - Type ${m.type}, Qty ${m.quantity}`));
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
