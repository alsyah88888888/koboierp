const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const receipts = await prisma.goodsReceipt.findMany({ select: { receiptNumber: true, receivedFrom: true }, orderBy: { date: 'desc' }, take: 2 })
  console.log("Goods Receipts:", receipts)
}
main()
