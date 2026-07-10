const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const so = await prisma.salesOrder.findFirst({ where: { orderNumber: 'KB-TRN-03062026-005' }, include: { items: true } })
  console.log("SO:", JSON.stringify(so, null, 2))
  
  const gr = await prisma.goodsReceipt.findFirst({ where: { receiptNumber: 'KB-LPBD-07072026-005' }, include: { items: true } })
  console.log("GR:", JSON.stringify(gr, null, 2))
  
  const pr = await prisma.purchaseRequest.findFirst({ where: { number: 'KB-PR-20260604-002' }, include: { items: true } })
  console.log("PR:", JSON.stringify(pr, null, 2))
}
main()
