import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
    console.log("--- Checking SalesDelivery Consistency ---");
    const sales = await prisma.salesDelivery.findMany({
        select: { id: true, createdAt: true, date: true }
    });
    const inconsistentSales = sales.filter(s => s.date.getTime() !== s.createdAt.getTime());
    console.log(`Total Sales: ${sales.length}`);
    console.log(`Inconsistent Sales (date != createdAt): ${inconsistentSales.length}`);

    console.log("\n--- Checking GoodsReceipt Prefix Consistency ---");
    const receipts = await prisma.goodsReceipt.findMany({
        select: { id: true, receiptNumber: true, taxRate: true, totalDiscount: true }
    });
    
    const inconsistentReceipts = receipts.filter(r => {
        const hasTaxOrDisc = (Number(r.taxRate) || 0) > 0 || (Number(r.totalDiscount) || 0) > 0;
        const isLPBD = r.receiptNumber.startsWith("KB-LPBD-");
        return hasTaxOrDisc && !isLPBD;
    });

    console.log(`Total Receipts: ${receipts.length}`);
    console.log(`Inconsistent Receipts (Tax/Disc exists but prefix is LPB): ${inconsistentReceipts.length}`);
}

check()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
