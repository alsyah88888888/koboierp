const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  // Test Prisma decimal behavior
  const val = 124000 / 1.11; // 111711.7117117117
  console.log("val:", val);
  
  // We can just update a single item and see what Prisma reads back!
  const item = await prisma.salesDeliveryItem.findFirst({ where: { quantity: 213 } });
  if (item) {
     await prisma.salesDeliveryItem.update({
        where: { id: item.id },
        data: { salesPrice: val }
     });
     
     const reRead = await prisma.salesDeliveryItem.findUnique({ where: { id: item.id } });
     console.log("reRead salesPrice:", reRead.salesPrice);
  } else {
     console.log("item not found");
  }
  process.exit(0);
})();
