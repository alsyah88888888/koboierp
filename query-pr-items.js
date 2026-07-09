const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const pr = await prisma.purchaseRequest.findFirst({
    where: { category: 'PEMBELIAN' },
    include: { items: true },
    orderBy: { date: 'desc' }
  })
  console.log(pr)
}
main()
