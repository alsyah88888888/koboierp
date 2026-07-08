import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("Checking SalesDelivery with taxRate = 12...");
    const sdCount = await prisma.salesDelivery.count({ where: { taxRate: 12 } });
    console.log(`Found ${sdCount} SalesDelivery records with taxRate 12.`);

    if (sdCount > 0) {
        const res = await prisma.salesDelivery.updateMany({
            where: { taxRate: 12 },
            data: { taxRate: 11 }
        });
        console.log(`Updated ${res.count} SalesDelivery records.`);
    }

    console.log("Checking GoodsReceipt with taxRate = 12...");
    const grCount = await prisma.goodsReceipt.count({ where: { taxRate: 12 } });
    console.log(`Found ${grCount} GoodsReceipt records with taxRate 12.`);
    
    if (grCount > 0) {
        const res = await prisma.goodsReceipt.updateMany({
            where: { taxRate: 12 },
            data: { taxRate: 11 }
        });
        console.log(`Updated ${res.count} GoodsReceipt records.`);
    }

    console.log("Checking SalesOrder with taxRate = 12...");
    const soCount = await prisma.salesOrder.count({ where: { taxRate: 12 } });
    console.log(`Found ${soCount} SalesOrder records with taxRate 12.`);

    if (soCount > 0) {
        const res = await prisma.salesOrder.updateMany({
            where: { taxRate: 12 },
            data: { taxRate: 11 }
        });
        console.log(`Updated ${res.count} SalesOrder records.`);
    }

}

main().catch(console.error).finally(() => prisma.$disconnect());
