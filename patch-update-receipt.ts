import fs from 'fs';
const path = 'src/lib/services/purchase-service.ts';
let code = fs.readFileSync(path, 'utf8');

// 1. Remove the old voiding logic
code = code.replace(/\/\/ ─── Void old ProductLots for this GR before updating ───────────[\s\S]*?\/\/ ────────────────────────────────────────────────────────────────/, '');

// 2. We need to save the old allocations BEFORE deleting GoodsReceiptItem
// Find: await tx.goodsReceiptItem.deleteMany({ where: { receiptId: id } });
const replace1 = `
        // ─── Save old Lot allocations ───────────
        const oldLots = await tx.productLot.findMany({
            where: { grNumber: oldReceipt.receiptNumber },
            include: { allocations: true }
        });
        const savedAllocations: { productId: string, qty: number, hppAtTime: any, createdAt: Date, sdItemId: string }[] = [];
        for (const lot of oldLots) {
            for (const alloc of lot.allocations) {
                savedAllocations.push({
                    productId: lot.productId,
                    qty: alloc.qty,
                    hppAtTime: alloc.hppAtTime,
                    createdAt: alloc.createdAt,
                    sdItemId: alloc.sdItemId
                });
            }
        }
        
        await tx.goodsReceiptItem.deleteMany({ where: { receiptId: id } });
`;
code = code.replace(`await tx.goodsReceiptItem.deleteMany({ where: { receiptId: id } });`, replace1);

// 3. After creating new ProductLot, restore the allocations
// Find:         // ────────────────────────────────────────────────────────────────
// After: } // end of if (updatedReceipt)
const replace2 = `
        // ─── Restore Lot Allocations ───────────────
        if (updatedReceipt) {
            for (const alloc of savedAllocations) {
                // Find a new lot for this productId that has enough remainingQty, or just any new lot
                const newLot = await tx.productLot.findFirst({
                    where: { grNumber: currentReceiptNumber, productId: alloc.productId },
                    orderBy: { remainingQty: 'desc' }
                });
                if (newLot) {
                    const consume = Math.min(alloc.qty, newLot.remainingQty);
                    if (consume > 0) {
                        await tx.lotAllocation.create({
                            data: {
                                lotId: newLot.id,
                                sdItemId: alloc.sdItemId,
                                qty: consume,
                                hppAtTime: alloc.hppAtTime,
                                createdAt: alloc.createdAt
                            }
                        });
                        await tx.productLot.update({
                            where: { id: newLot.id },
                            data: { remainingQty: { decrement: consume } }
                        });
                    }
                }
            }
        }
        // ────────────────────────────────────────────────────────────────
`;
code = code.replace(`        // ────────────────────────────────────────────────────────────────\n\n        revalidatePath("/purchase", "layout");`, replace2 + `\n        revalidatePath("/purchase", "layout");`);

fs.writeFileSync(path, code);
console.log("Patched purchase-service.ts!");
