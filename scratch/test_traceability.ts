import { PrismaClient } from '@prisma/client';
import { calculateProductTraceabilityInternal } from '../src/lib/services/report-service';

async function main() {
  const result = await calculateProductTraceabilityInternal(new Date('2026-07-01'), new Date('2026-07-31'));
  
  let totalOps = 0;
  result.forEach((r: any) => {
      totalOps += Math.abs(Number(r.OPS || 0));
  });
  
  console.log('JULY Traceability Total OPS:', totalOps);
  
  const result8 = await calculateProductTraceabilityInternal(new Date('2026-08-01'), new Date('2026-08-31'));
  let totalOps8 = 0;
  result8.forEach((r: any) => {
      totalOps8 += Math.abs(Number(r.OPS || 0));
  });
  
  console.log('AUGUST Traceability Total OPS:', totalOps8);
}

main();
