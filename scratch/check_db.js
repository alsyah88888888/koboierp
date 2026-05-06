
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const delivery = await prisma.salesDelivery.findUnique({
    where: { id: 'cmoqqv7ao014ql1jvxo6nc2af' },
    select: { grandTotal: true, subtotal: true, taxAmount: true, totalDiscount: true }
  });
  console.log(JSON.stringify(delivery, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
