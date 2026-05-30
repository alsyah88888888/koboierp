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
    
    // Filter rows for "SO KLIN ROYALE PARFUM SERIES PURPLE DAWN"
    const soKlinRows = result.filter((row: any) => 
      row['KETERANGAN ITEM'] && row['KETERANGAN ITEM'].includes('PURPLE DAWN')
    );
    
    console.log('\n--- Rows for SO KLIN ROYALE PARFUM SERIES PURPLE DAWN in May 2026 ---');
    console.log(soKlinRows.map(row => ({
      NO: row['NO'],
      'NOMOR SJ': row['NOMOR SJ'],
      'TANGGAL JUAL': row['TANGGAL JUAL'],
      'QTY JUAL': row['QTY JUAL'],
      'HARGA JUAL': row['HARGA JUAL'],
      'NOMOR LPB': row['NOMOR LPB'],
      'NAMA SUPPLIER': row['NAMA SUPPLIER'],
      'QTY BELI': row['QTY BELI'],
      'HARGA BELI': row['HARGA BELI'],
      'TOTAL BELI': row['TOTAL BELI']
    })));
  } catch (err) {
    console.error('Unhandled error:', err);
  }
}

test();
