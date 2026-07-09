const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const so = await prisma.salesOrder.findMany({ select: { orderNumber: true }, take: 5 })
  const pr = await prisma.purchaseRequest.findMany({ select: { number: true }, take: 5 })
  console.log("Sales Orders:", so)
  console.log("Purchase Requests:", pr)
}
main()
