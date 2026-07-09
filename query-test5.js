const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const so = await prisma.salesOrder.findMany({ select: { orderNumber: true } })
  const prefixes = [...new Set(so.map(s => s.orderNumber.split('-')[1]))]
  console.log("Sales Order Prefixes:", prefixes)
}
main()
