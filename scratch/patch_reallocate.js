const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/lib/services/report-service.ts');
let content = fs.readFileSync(filePath, 'utf8');

const target = `    // Delete existing lot allocation(s) for this sale item
    await prisma.lotAllocation.deleteMany({
        where: { sdItemId: saleItem.id }
    });
    
    // Create new lot allocation
    await prisma.lotAllocation.create({
        data: {
            sdItemId: saleItem.id,
            lotId: targetLot.id,
            qty: saleItem.quantity,
            hppAtTime: targetLot.purchasePrice
        }
    });

    return true;`;

const replacement = `    // Find existing lot allocations for this sale item
    const existingAllocations = await prisma.lotAllocation.findMany({
        where: { sdItemId: saleItem.id }
    });

    // Run transaction to ensure atomicity
    await prisma.$transaction(async (tx: any) => {
        // 1. Restore qty to old lots
        for (const alloc of existingAllocations) {
            await tx.productLot.update({
                where: { id: alloc.lotId },
                data: { remainingQty: { increment: alloc.qty } }
            });
        }

        // 2. Delete existing lot allocation(s) for this sale item
        await tx.lotAllocation.deleteMany({
            where: { sdItemId: saleItem.id }
        });
        
        // 3. Create new lot allocation
        await tx.lotAllocation.create({
            data: {
                sdItemId: saleItem.id,
                lotId: targetLot.id,
                qty: saleItem.quantity,
                hppAtTime: targetLot.purchasePrice
            }
        });

        // 4. Deduct qty from new lot
        await tx.productLot.update({
            where: { id: targetLot.id },
            data: { remainingQty: { decrement: saleItem.quantity } }
        });
    });

    return true;`;

content = content.replace(target, replacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Patched reallocateLotService");
