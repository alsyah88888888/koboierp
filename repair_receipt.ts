import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const receiptNumber = 'KB-LPBD-20260312-001'
  
  // New values calculated to match 128,695,776
  const newSubtotal = 126270268
  const newTaxAmount = 13889732
  const newGrandTotal = 128695776

  const updated = await prisma.goodsReceipt.update({
    where: { receiptNumber: receiptNumber },
    data: {
      subtotal: newSubtotal,
      taxAmount: newTaxAmount,
      grandTotal: newGrandTotal,
    }
  })

  console.log('Successfully updated receipt:', updated.receiptNumber)
  console.log('New Grand Total:', updated.grandTotal.toString())
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
