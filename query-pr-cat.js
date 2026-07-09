const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const prs = await prisma.purchaseRequest.groupBy({ by: ['category'], _count: true })
  console.log(prs)
}
main()
