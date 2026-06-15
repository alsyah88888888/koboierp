const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sd = await prisma.salesDelivery.findFirst({
    where: { 
      OR: [
        { deliveryNumber: { contains: '01062026-003' } },
        { invoiceNumber: { contains: '01062026-003' } }
      ]
    },
    include: {
      items: {
        include: {
          product: { select: { sku: true, name: true } }
        }
      },
      order: {
        include: {
          items: {
            include: {
              product: { select: { sku: true, name: true } }
            }
          }
        }
      }
    }
  });
  
  console.dir({ salesDelivery: sd }, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
