const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEndsWith(modelName, field) {
  const allRecords = await prisma[modelName].findMany();
  const matched = allRecords.filter(r => {
    const valStr = String(r[field] || '0');
    return valStr.endsWith('999') || valStr.endsWith('001');
  });
  if (matched.length > 0) {
    console.log(`Model ${modelName}: Found ${matched.length} records ending in 999 or 001`);
    matched.forEach(m => {
       console.log(` - ID: ${m.id} | Field: ${m[field]} | Number: ${m.orderNumber || m.deliveryNumber || m.receiptNumber || m.returnNumber || 'N/A'}`);
    });
  }
}

async function main() {
  await checkEndsWith('salesDelivery', 'grandTotal');
  await checkEndsWith('salesOrder', 'grandTotal');
  await checkEndsWith('purchaseOrder', 'grandTotal');
  await checkEndsWith('goodsReceipt', 'grandTotal');
  await checkEndsWith('salesReturn', 'grandTotal');
  await checkEndsWith('purchaseReturn', 'grandTotal');
}

main().catch(console.error).finally(() => prisma.$disconnect());
