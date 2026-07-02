import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const sale = await prisma.salesDelivery.findFirst({
    where: { invoiceNumber: 'KB-TRN-18062026-001' },
    include: {
      items: {
        include: {
          product: { select: { sku: true, name: true, purchasePrice: true } }
        }
      }
    }
  });

  if (sale) {
    console.log("Found by invoiceNumber:", sale.deliveryNumber);
    console.log("Grand Total:", sale.grandTotal);
    sale.items.forEach(i => {
      if (i.product?.name.toLowerCase().includes('kecap')) {
        console.log(`Product: ${i.product.name}`);
        console.log(`Qty: ${i.quantity}, Sales Price: ${i.salesPrice}`);
      }
    });
  }
}
main().finally(() => prisma.$disconnect());
