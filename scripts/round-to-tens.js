const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function roundModel(modelName) {
  const allRecords = await prisma[modelName].findMany();
  let updatedCount = 0;
  
  for (const r of allRecords) {
    const oldGrandTotal = Number(r.grandTotal || 0);
    const newGrandTotal = Math.round(oldGrandTotal / 10) * 10;
    
    if (oldGrandTotal !== newGrandTotal) {
      const diff = newGrandTotal - oldGrandTotal;
      const newTaxAmount = Number(r.taxAmount || 0) + diff;
      
      await prisma[modelName].update({
        where: { id: r.id },
        data: {
          grandTotal: newGrandTotal,
          taxAmount: newTaxAmount
        }
      });
      updatedCount++;
    }
  }
  
  console.log(`Model ${modelName}: Rounded ${updatedCount} records to nearest 10`);
}

async function main() {
  await roundModel('salesDelivery');
  await roundModel('salesOrder');
  await roundModel('goodsReceipt');
  await roundModel('purchaseOrder');
  await roundModel('salesReturn');
  await roundModel('purchaseReturn');
}

main().catch(console.error).finally(() => prisma.$disconnect());
