const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const gr = await prisma.goodsReceipt.findMany({ select: { receiptNumber: true, receivedFrom: true, items: { select: { quantity: true, productId: true } } }, orderBy: { date: 'desc' }, take: 2 })
  console.log("Goods Receipts:", JSON.stringify(gr, null, 2))
}
main()
