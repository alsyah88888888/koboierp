const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const gr = await prisma.goodsReceipt.findUnique({
      where: { receiptNumber: 'KB-LPB-12062026-005' }
    });

    const sd = await prisma.salesDelivery.findFirst({
      where: { deliveryNumber: 'SJ-231-12062026-018' }
    });

    console.log('GR (KB-LPB-12062026-005):');
    console.log(`  Date: ${gr.date?.toISOString()}`);
    console.log(`  CreatedAt: ${gr.createdAt?.toISOString()}`);

    console.log('SD (SJ-231-12062026-018):');
    console.log(`  Date: ${sd.date?.toISOString()}`);
    console.log(`  CreatedAt: ${sd.createdAt?.toISOString()}`);

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
