const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixModel(modelName) {
  const allRecords = await prisma[modelName].findMany();
  let updatedCount = 0;
  
  for (const r of allRecords) {
    const oldGrandTotal = Number(r.grandTotal || 0);
    const remainder = oldGrandTotal % 1000;
    
    let newGrandTotal = oldGrandTotal;
    if (remainder === 999) newGrandTotal += 1;
    else if (remainder === 1) newGrandTotal -= 1;
    else if (remainder === 998) newGrandTotal += 2;
    else if (remainder === 2) newGrandTotal -= 2;
    
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
  
  console.log(`Model ${modelName}: Fixed ${updatedCount} artifact records`);
}

async function main() {
  await fixModel('salesDelivery');
  await fixModel('salesOrder');
  await fixModel('goodsReceipt');
  await fixModel('purchaseOrder');
  await fixModel('salesReturn');
  await fixModel('purchaseReturn');
}

main().catch(console.error).finally(() => prisma.$disconnect());
