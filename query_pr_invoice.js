const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const prWithInvoice = await prisma.purchaseRequest.findMany({ 
    where: { invoiceNumber: { not: null } },
    select: { number: true, invoiceNumber: true, receiptNumber: true, notes: true, category: true }
  })
  console.log("PRs with invoiceNumber:", JSON.stringify(prWithInvoice, null, 2))
}
main()
