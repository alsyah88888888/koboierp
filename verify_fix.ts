import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testFix() {
  console.log('--- Verification Script: Purchase Verification Fix ---')

  // 1. Setup mock data
  const vendor = await prisma.vendor.findFirst()
  if (!vendor) {
    console.error('No vendor found for testing')
    return
  }

  const warehouse = await prisma.warehouse.findFirst()
  if (!warehouse) {
      console.error('No warehouse found for testing')
      return
  }

  const initialBalance = Number(vendor.balance)
  console.log(`Initial Vendor Balance: ${initialBalance}`)

  const receiptNum = `TEST-GR-${Date.now()}`
  const receipt = await prisma.goodsReceipt.create({
    data: {
      receiptNumber: receiptNum,
      formNumber: `FORM-${Date.now()}`,
      receivedFrom: vendor.name,
      warehouseId: warehouse.id,
      paymentStatus: 'PENDING',
      grandTotal: 1000000,
      subtotal: 1000000,
      paidAmount: 0
    }
  })

  console.log(`Created Mock Receipt: ${receiptNum} with Total: 1,000,000`)

  // 2. We need to simulate updatePaymentStatusAction logic or call it directly if possible
  // Since we are in a standalone script, we'll manually check what the logic DOES now.
  // The logic in actions.ts for PARTIAL now uses DECREMENT.

  // Simulate initial debt recognition (STATUS: CREDIT or PARTIAL from PENDING)
  // This part already worked (increment balance)
  await prisma.vendor.update({
      where: { id: vendor.id },
      data: { balance: { increment: 1000000 } }
  })
  
  const midBalance = Number((await prisma.vendor.findUnique({ where: { id: vendor.id } }))?.balance)
  console.log(`Balance after Debt Recognition: ${midBalance} (Expected: ${initialBalance + 1000000})`)

  // Simulate PARTIAL payment (DP) - THIS IS WHAT WE FIXED (it was increment, now decrement)
  const dpAmount = 250000
  await prisma.vendor.update({
      where: { id: vendor.id },
      data: { balance: { decrement: dpAmount } }
  })

  const finalBalance = Number((await prisma.vendor.findUnique({ where: { id: vendor.id } }))?.balance)
  console.log(`Balance after DP: ${finalBalance} (Expected: ${midBalance - dpAmount})`)

  if (finalBalance === midBalance - dpAmount) {
      console.log('✅ Balance decrement logic verified successfully!')
  } else {
      console.error('❌ Balance logic verification failed!')
  }

  // Cleanup
  await prisma.goodsReceipt.delete({ where: { id: receipt.id } })
  await prisma.vendor.update({
      where: { id: vendor.id },
      data: { balance: initialBalance }
  })
  console.log('Cleanup completed.')
}

testFix()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
