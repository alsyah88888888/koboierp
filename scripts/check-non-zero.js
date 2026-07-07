const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNonZero(modelName, field) {
  const allRecords = await prisma[modelName].findMany();
  const matched = allRecords.filter(r => {
    const val = Number(r[field] || 0);
    return val % 10 !== 0;
  });
  if (matched.length > 0) {
    console.log(`Model ${modelName}: Found ${matched.length} records ending in non-zero single digit`);
    matched.forEach(m => {
       console.log(` - ID: ${m.id} | Field: ${m[field]} | Number: ${m.orderNumber || m.deliveryNumber || m.receiptNumber || m.returnNumber || 'N/A'}`);
    });
  }
}

async function main() {
  await checkNonZero('salesDelivery', 'grandTotal');
  await checkNonZero('salesOrder', 'grandTotal');
  await checkNonZero('purchaseOrder', 'grandTotal');
  await checkNonZero('goodsReceipt', 'grandTotal');
  await checkNonZero('salesReturn', 'grandTotal');
  await checkNonZero('purchaseReturn', 'grandTotal');
}

main().catch(console.error).finally(() => prisma.$disconnect());
