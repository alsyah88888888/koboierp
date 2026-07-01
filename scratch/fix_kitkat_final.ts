import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixKitKatStockTo46Ctn() {
    const product = await prisma.product.findFirst({
        where: { barcode: '8992696527874' }
    });

    if (!product) return;

    const warehouse = await prisma.warehouse.findFirst();
    if (!warehouse) return;

    // We want physical stock to be exactly 1104 (46 ctn)
    const targetQty = 1104;

    console.log(`Setting stock for KIT KAT (ID: ${product.id}) to exactly ${targetQty} pcs (46 ctn)`);

    // 1. Delete all messy existing stock records for this product
    await prisma.stock.deleteMany({
        where: { productId: product.id }
    });

    // 2. Create one consolidated stock record under "UMUM"
    await prisma.stock.create({
        data: {
            productId: product.id,
            warehouseId: warehouse.id,
            vendorName: "UMUM",
            quantity: targetQty
        }
    });

    // 3. Add a PENYESUAIAN-FISIK movement so the total movements will match the new stock
    // Since previous movements sum up to 362, we add a movement of 742 to reach 1104.
    const diff = targetQty - 362;
    if (diff !== 0) {
        await prisma.stockMovement.create({
            data: {
                productId: product.id,
                warehouseId: warehouse.id,
                vendorName: "UMUM",
                quantity: diff,
                type: diff > 0 ? "IN" : "OUT",
                reference: "PENYESUAIAN-FISIK-01072026"
            }
        });
    }

    console.log(`Stock successfully reset to 1104 pcs. You can now sell it!`);
}

fixKitKatStockTo46Ctn().catch(console.error).finally(() => prisma.$disconnect());
