import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixAndSplitKitKat() {
    const product = await prisma.product.findFirst({ where: { barcode: '8992696527874' } });
    if (!product) return;

    // Physical confirmed: Cibinong=14, Cikokol=31 → need to find Cikokol warehouse
    const warehouses = await prisma.warehouse.findMany();
    console.log("Warehouses:", warehouses.map(w => `${w.id}: ${w.name}`));

    // Find or we need to check if Cikokol is a separate warehouse or a vendor
    const stocks = await prisma.stock.findMany({
        where: { productId: product.id },
        include: { warehouse: true }
    });
    
    console.log("\nCurrent stocks:");
    for (const s of stocks) {
        console.log(`  ${s.warehouse.name} | ${s.vendorName} | qty: ${s.quantity}`);
    }

    // Check what warehouse Cikokol is
    const cikokolWh = warehouses.find(w => w.name.toLowerCase().includes('cikokol'));
    console.log("\nCikokol warehouse:", cikokolWh ? `${cikokolWh.id}: ${cikokolWh.name}` : "NOT FOUND as separate warehouse");
    
    const cibinongWh = warehouses.find(w => w.name.toLowerCase().includes('cibinong') || w.name.toLowerCase() === 'cibinong');
    console.log("Cibinong warehouse:", cibinongWh ? `${cibinongWh.id}: ${cibinongWh.name}` : "NOT FOUND");
}

fixAndSplitKitKat().catch(console.error).finally(() => prisma.$disconnect());
