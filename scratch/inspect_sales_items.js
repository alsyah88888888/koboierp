const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const deliveries = await prisma.salesDelivery.findMany({
      where: {
        date: {
          gte: new Date('2026-06-12T00:00:00.000Z'),
          lte: new Date('2026-06-12T23:59:59.000Z')
        }
      },
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

    console.log('DELIVERIES ON 12 JUNE 2026:', JSON.stringify(deliveries, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
