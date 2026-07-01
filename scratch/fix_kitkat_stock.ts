import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixKitKatStock() {
    const product = await prisma.product.findFirst({ where: { barcode: '8992696527874' } });
    if (!product) {
        console.error("Product not found");
        return;
    }

    const cibinongWh = await prisma.warehouse.findFirst({
        where: { name: 'CIBINONG' }
    });
    if (!cibinongWh) {
        console.error("Cibinong warehouse not found");
        return;
    }

    console.log("Fixing Kit Kat stock in Cibinong...");

    await prisma.$transaction(async (tx) => {
        // 1. Delete all current stock records for this product to reset
        await tx.stock.deleteMany({
            where: {
                productId: product.id,
                warehouseId: cibinongWh.id
            }
        });

        // 2. Insert the correct physical stock (14 for UMUM, 31 for CIKOKOL)
        await tx.stock.createMany({
            data: [
                {
                    productId: product.id,
                    warehouseId: cibinongWh.id,
                    vendorName: "UMUM",
                    quantity: 14,
                },
                {
                    productId: product.id,
                    warehouseId: cibinongWh.id,
                    vendorName: "PT INTI CAKRAWALA CITRA ( CIKOKOL )",
                    quantity: 31,
                }
            ]
        });

        // 3. Create a single StockMovement to log this adjustment
        await tx.stockMovement.create({
            data: {
                productId: product.id,
                warehouseId: cibinongWh.id,
                vendorName: "UMUM",
                quantity: 0, // This is just a log, net difference from 91 to 45 is -46
                type: "ADJUSTMENT",
                reference: "KOREKSI-FISIK-01072026-FINAL",
            }
        });
    });

    console.log("Stock adjusted successfully! 14 UMUM, 31 CIKOKOL");
}

fixKitKatStock()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
