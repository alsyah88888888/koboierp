const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const delivery = await prisma.salesDelivery.findFirst({
      where: { deliveryNumber: 'KB-TRD-16052026-001' },
      include: {
        items: {
          include: {
            product: true,
            lotAllocations: {
              include: {
                lot: true
              }
            }
          }
        }
      }
    });

    console.log('DELIVERY:', JSON.stringify(delivery, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
