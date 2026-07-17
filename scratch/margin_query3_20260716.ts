import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
function num(d: any) { return d ? Number(d) : 0; }

async function checkProduct(nameContains: string) {
    const products = await prisma.product.findMany({ where: { name: { contains: nameContains, mode: 'insensitive' } } });
    for (const p of products) {
        console.log(`\nProduct: ${p.name} | sku=${p.sku} | Product.purchasePrice=${p.purchasePrice} | Product.salesPrice=${p.salesPrice}`);
        const lastReceipts = await prisma.goodsReceiptItem.findMany({
            where: { productId: p.id },
            include: { receipt: true },
            orderBy: { receipt: { date: 'desc' } },
            take: 3,
        });
        for (const r of lastReceipts) {
            console.log(`   GR ${r.receipt.receiptNumber} date=${r.receipt.date?.toISOString().slice(0,10)} purchasePrice=${r.purchasePrice} qty=${r.quantity}`);
        }
        const lots = await prisma.productLot.findMany({ where: { productId: p.id }, orderBy: { grDate: 'desc' }, take: 3 });
        for (const l of lots) {
            console.log(`   Lot ${l.lotNumber} grDate=${l.grDate.toISOString().slice(0,10)} purchasePrice=${l.purchasePrice} landedCost=${l.landedCost} remainingQty=${l.remainingQty} isVoided=${l.isVoided}`);
        }
    }
}

async function main() {
    await checkProduct('Nescafe Coffee Ready To Drink Cappuccino');
    await checkProduct('Nescafe Coffee Ready To Drink Caramel Macchiato');
    await checkProduct('Nescafe Coffee Ready To Drink Latte');
    await checkProduct('NESCAFE CLASSIC JAR 24x100gr');
    await checkProduct('NESCAFE CLASSIC JAR 12x200gr');
}
main().catch(console.error).finally(() => prisma.$disconnect());
