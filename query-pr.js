const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const pr = await prisma.purchaseRequest.findMany({ select: { number: true, status: true, vendor: { select: { name: true } }, items: { select: { quantity: true, receivedQuantity: true } } }, orderBy: { date: 'desc' }, take: 2 })
  console.log("Purchase Requests:", JSON.stringify(pr, null, 2))
}
main()
