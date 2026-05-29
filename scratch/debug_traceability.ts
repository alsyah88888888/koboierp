import { PrismaClient } from '@prisma/client'
import { getProductTraceabilityService } from '../src/lib/services/report-service'

const prisma = new PrismaClient()

async function testTraceability() {
  console.log('--- Traceability SalesPerson Match Debug ---')
  try {
    const data = await getProductTraceabilityService(5, 2026) // Month 5, Year 2026
    if ('error' in data) {
      console.error('Error fetching traceability:', data.error)
      return
    }

    console.log(`Total records in report: ${data.length}`)
    const mismatches = data.filter((item: any) => {
      const beli = item['Sales Person Beli']
      const jual = item['Sales Person Jual']
      return beli !== '-' && jual !== '-' && beli !== jual
    })

    console.log(`Found ${mismatches.length} mismatches where Beli !== Jual (and both are not '-')`)
    if (mismatches.length > 0) {
      console.log('First 5 mismatches:')
      console.log(JSON.stringify(mismatches.slice(0, 5), null, 2))
    }

    const allRecords = data.slice(0, 10)
    console.log('First 10 records overall:')
    console.log(JSON.stringify(allRecords, null, 2))
  } catch (err) {
    console.error('Error:', err)
  }
}

testTraceability()
  .finally(async () => {
    await prisma.$disconnect()
  })
