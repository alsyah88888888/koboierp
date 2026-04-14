
import { getProductTraceabilityService } from './src/lib/services/report-service';

async function main() {
    console.log('--- STARTING FIFO TRACEABILITY VERIFICATION ---');
    try {
        const data = await getProductTraceabilityService(4, 2026);
        const filtered = data.filter((row: any) => row.SKU === 'FOOPANTENE-530');
        
        console.log(`\nFound ${filtered.length} matching rows for FOOPANTENE-530 in April 2026:`);
        
        filtered.forEach((r: any, idx: number) => {
            console.log(`${idx + 1}. [${r['Tanggal']}]`);
            console.log(`   SJ : ${r['[JUAL] No. TRN']} (Qty: ${r['[JUAL] Qty Penjodoh']})`);
            console.log(`   LPB: ${r['[BELI] No. LPB']} (LPB Qty: ${r['[BELI] Qty Bersih']})`);
            console.log(`   Margin: ${r['Margin Estimasi (Rp)']}`);
            console.log('   -----------------------------------');
        });

        const totalMatched = filtered.reduce((acc: number, r: any) => acc + r['[JUAL] Qty Penjodoh'], 0);
        console.log(`\nTOTAL QTY PENJODOH: ${totalMatched}`);
        
    } catch (err) {
        console.error('ERROR DURING VERIFICATION:', err);
    }
}

main();
