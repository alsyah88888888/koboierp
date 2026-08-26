import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const movements = await prisma.stockMovement.findMany({
        where: { 
            productId: 'cmm3z2qr2001ouumcte8t2che',
            warehouseId: 'cmm4a82ll0008uu4gdktls8kf',
            vendorName: 'PT JESSINDO PRAKARSA '
        },
        orderBy: { createdAt: 'asc' }
    });
    console.log("All Movements for this Vendor:", movements);
}
main();
