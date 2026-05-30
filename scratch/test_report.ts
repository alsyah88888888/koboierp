import { getProductTraceabilityService } from '../src/lib/services/report-service';

async function test() {
  try {
    console.log('Generating Product Traceability Report for May 2026...');
    const result = await getProductTraceabilityService(5, 2026);
    if ('error' in result) {
      console.error('Error generating report:', result.error);
      return;
    }
    
    console.log(`Report generated successfully! Total rows: ${result.length}`);
    
    console.log('\n--- Checking for any items in May 2026 that had discounts ---');
    const discountedRows = result.filter((row: any) => {
      // In report, the price column is 'HARGA JUAL' (which is sellPriceWithTax).
      // We can infer if there is discount if the 'TOTAL JUAL' is less than QTY * HARGA JUAL.
      const qty = Number(row['QTY JUAL'] || 0);
      const price = Number(row['HARGA JUAL'] || 0);
      const total = Number(row['TOTAL JUAL'] || 0);
      return total < (qty * price) - 10; // offset for rounding
    });

    console.log(`Discounted rows found: ${discountedRows.length}`);
    if (discountedRows.length > 0) {
      console.log(discountedRows.slice(0, 5).map(row => ({
        'NOMOR SJ': row['NOMOR SJ'],
        'KETERANGAN ITEM': row['KETERANGAN ITEM'],
        'QTY JUAL': row['QTY JUAL'],
        'HARGA JUAL': row['HARGA JUAL'],
        'TOTAL JUAL': row['TOTAL JUAL'],
        'DPP': row['DPP'],
        'TOTAL BELI': row['TOTAL BELI'],
        'MARGIN': row['MARGIN'],
        'MARGIN %': row['MARGIN %']
      })));
    }
  } catch (err) {
    console.error('Unhandled error:', err);
  }
}

test();
