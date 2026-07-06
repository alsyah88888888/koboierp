import { getPrisma } from '../src/lib/prisma';
import { getCrossDivisionSalesService } from '../src/lib/services/report-service';

async function run() {
    const prisma = getPrisma();
    const result = await getCrossDivisionSalesService('06', 2026, 'ALL');
    
    console.log(`Pembelian PF - Penjualan BC: ${result.pfToBc.length} baris`);
    for (const item of result.pfToBc) {
        console.log(`- Item: ${item.product} (Qty: ${item.qty}) | Harga: ${item.cost} | SJ: ${item.sjNumber}`);
    }

    console.log(`\nPembelian BC - Penjualan PF: ${result.bcToPf.length} baris`);
    for (const item of result.bcToPf) {
        console.log(`- Item: ${item.product} (Qty: ${item.qty}) | Harga: ${item.cost} | SJ: ${item.sjNumber}`);
    }
}

run().catch(console.error).finally(async () => {
    const prisma = getPrisma();
    await prisma.$disconnect();
});
