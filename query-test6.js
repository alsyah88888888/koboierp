const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const soCount = await prisma.salesOrder.count({ where: { orderNumber: { contains: 'TRN' } } })
  const trnLatest = await prisma.salesOrder.findMany({ where: { orderNumber: { contains: 'TRN' } }, orderBy: { date: 'desc' }, take: 1, select: { orderNumber: true, date: true } })
  console.log("TRN count:", soCount)
  console.log("Latest TRN:", trnLatest)
}
main()
