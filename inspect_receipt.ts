import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const receipt = await prisma.goodsReceipt.findUnique({
    where: { formNumber: 'PO-202603120008' },
    include: {
      items: {
        include: {
          product: true
        }
      }
    }
  })

  console.log(JSON.stringify(receipt, null, 2))
}

main()
  .catch((e) => {
    throw e
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
