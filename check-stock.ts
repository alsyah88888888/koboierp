import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const stock = await prisma.stock.findUnique({
        where: {
            productId_warehouseId_vendorName: {
                productId: 'cmm3z2qr2001ouumcte8t2che',
                warehouseId: 'cmm4a82ll0008uu4gdktls8kf',
                vendorName: 'PT JESSINDO PRAKARSA '
            }
        }
    });
    console.log("Stock:", stock);
    
    // Check if the ProductLot for this voided GR is voided
    const lots = await prisma.productLot.findMany({
        where: { grNumber: 'KB-LPBD-07082026-009' }
    });
    console.log("Product Lots:", lots);
}
main();
