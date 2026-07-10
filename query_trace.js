const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const so = await prisma.salesOrder.findFirst({ where: { orderNumber: { contains: '03062026' } } })
  console.log("SO:", so)
}
main()
