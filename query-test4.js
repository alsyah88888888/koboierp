const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const po = await prisma.purchaseOrder.findMany({ select: { number: true }, orderBy: { date: 'desc' }, take: 10 })
  console.log("Purchase Orders:", po)
}
main()
