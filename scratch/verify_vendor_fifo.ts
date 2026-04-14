
import { getProductTraceabilityService } from './src/lib/services/report-service';

async function main() {
    console.log('--- VERIFYING VENDOR-SPECIFIC FIFO (FOOPANTENE-530) ---');
    try {
        // Run for April 2026
        const data = await getProductTraceabilityService(4, 2026);
        
        // Find the specific SJ mentioned by user
        const targetSJ = 'KB-TRN-09042026-012';
        const sku = 'FOOPANTENE-530';
        
        const rows = data.filter((r: any) => r['[JUAL] No. TRN'] === targetSJ && r.SKU === sku);
        
        console.log(`\nFound ${rows.length} rows for ${sku} in SJ ${targetSJ}:`);
        
        rows.forEach((r: any, idx: number) => {
            console.log(`${idx + 1}. LPB No: ${r['[BELI] No. LPB']}`);
            console.log(`   Vendor: ${r['[BELI] Supplier']}`);
            console.log(`   Matched Qty: ${r['[JUAL] Qty Penjodoh']}`);
            console.log(`   -----------------------------------`);
        });

    } catch (err) {
        console.error('ERROR:', err);
    }
}

main();
