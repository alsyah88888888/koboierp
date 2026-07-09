const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const so = await prisma.salesOrder.findMany({ select: { orderNumber: true }, orderBy: { date: 'desc' }, take: 10 })
  console.log("Sales Orders:", so)
}
main()
