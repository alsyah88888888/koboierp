import { PrismaClient } from '@prisma/client';
import { getComprehensiveMonthlyReportService } from '../src/lib/services/report-service';

async function main() {
  // Try 8 because we're in August now, or 7 for July. The user is checking "Traceability Bulanan 68,467,930".
  // Let's try both 7 and 8 to see where 68,467,930 is.
  const result = await getComprehensiveMonthlyReportService(7, 2026);
  if (result.error) return;
  
  const opsKirim = (result as any).profitLoss?.expenseByCategory?.find((e: any) => e.name === 'Ops Kirim dan Muat')?.value;
  const opsUmum = (result as any).profitLoss?.expenseByCategory?.find((e: any) => e.name === 'Ops')?.value;
  
  console.log('JULY - Ops Kirim:', opsKirim, 'Ops Umum:', opsUmum);
  
  const result8 = await getComprehensiveMonthlyReportService(8, 2026);
  if (result8.error) return;
  
  const opsKirim8 = (result8 as any).profitLoss?.expenseByCategory?.find((e: any) => e.name === 'Ops Kirim dan Muat')?.value;
  const opsUmum8 = (result8 as any).profitLoss?.expenseByCategory?.find((e: any) => e.name === 'Ops')?.value;
  
  console.log('AUGUST - Ops Kirim:', opsKirim8, 'Ops Umum:', opsUmum8);
}

main();
