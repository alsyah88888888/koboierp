import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function renameUmum() {
    console.log("Renaming UMUM to CIBINONG in Stock...");
    const res1 = await prisma.stock.updateMany({
        where: { vendorName: 'UMUM' },
        data: { vendorName: 'CIBINONG' }
    });
    console.log(`Updated ${res1.count} stock records.`);

    console.log("Renaming UMUM to CIBINONG in StockMovement...");
    const res2 = await prisma.stockMovement.updateMany({
        where: { vendorName: 'UMUM' },
        data: { vendorName: 'CIBINONG' }
    });
    console.log(`Updated ${res2.count} stock movement records.`);
}

renameUmum().catch(console.error).finally(() => prisma.$disconnect());
