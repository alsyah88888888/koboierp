const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sd = await prisma.salesDelivery.findFirst({
    where: { deliveryNumber: 'KB-TRD-01062026-003' },
    include: {
      items: {
        include: {
          product: { select: { sku: true, name: true } },
          lotAllocations: { select: { qty: true } }
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
  
  const ops = await prisma.financeTransaction.findMany({
    where: { 
      description: { contains: 'KB-PR-20260601-005' }
    }
  });

  console.dir({ salesDelivery: sd, operationalExpense: ops }, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
