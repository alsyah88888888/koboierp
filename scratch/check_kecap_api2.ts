import { PrismaClient } from '@prisma/client';
import { calculateProductTraceabilityInternal } from './src/lib/services/report-service';
const prisma = new PrismaClient();

async function main() {
  const result = await calculateProductTraceabilityInternal();
  const row = result.find((r: any) => 
    r['NOMOR SJ'] === 'SJ-333-18062026-004' && r['KETERANGAN ITEM'].toLowerCase().includes('kecap')
  );
  if (row) {
    console.log("Traceability Row found!");
    console.log("Nomor LPB:", row['NOMOR LPB']);
    console.log("Tgl Beli:", row['TANGGAL BELI']);
    console.log("Total Beli:", row['TOTAL BELI']);
    console.log("Total Jual:", row['TOTAL JUAL']);
    console.log("Margin:", row['MARGIN']);
  } else {
    console.log("Not found in traceability");
  }
}
main().finally(() => prisma.$disconnect());
