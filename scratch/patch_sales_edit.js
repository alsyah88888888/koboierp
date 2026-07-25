const fs = require('fs');
const path = '/Users/alsyah/Documents/erp/src/lib/services/sales-service.ts';
let code = fs.readFileSync(path, 'utf8');

// 1. Insert isItemsUnchanged after oldDelivery check
code = code.replace(
    /if \(!oldDelivery\) throw new Error\("Delivery not found"\);/,
    `if (!oldDelivery) throw new Error("Delivery not found");

        const isItemsUnchanged = data.items.length === oldDelivery.items.length && data.items.every((newItem: any) => {
            const oldItem = oldDelivery.items.find((i: any) => i.productId === newItem.productId);
            if (!oldItem) return false;
            if (Number(oldItem.quantity) !== Number(newItem.quantity)) return false;
            if (oldItem.vendorName !== newItem.vendorName && newItem.vendorName !== undefined) return false;
            return true;
        });

        if (!isItemsUnchanged) {`
);

// 2. Close Phase 1 and 2 if block and add else block
code = code.replace(
    /await tx\.salesDeliveryItem\.deleteMany\(\{ where: \{ deliveryId: id \} \}\);/,
    `await tx.salesDeliveryItem.deleteMany({ where: { deliveryId: id } });
        } else {
            // Only update prices if needed
            for (const newItem of data.items) {
                const oldItem = oldDelivery.items.find((i: any) => i.productId === newItem.productId);
                if (oldItem && (oldItem.salesPrice?.toNumber() !== Number(newItem.salesPrice) || oldItem.discount?.toNumber() !== Number(newItem.discount))) {
                    await tx.salesDeliveryItem.update({
                        where: { id: oldItem.id },
                        data: {
                            salesPrice: Number(newItem.salesPrice) || 0,
                            discount: Number(newItem.discount) || 0
                        }
                    });
                }
            }
        }`
);

// 3. Wrap Phase 3 (create items & deduct stock)
code = code.replace(
    /for \(const item of data\.items\) \{\n\s+const vendorName = item\.vendorName \|\| "CIBINONG";/,
    `if (!isItemsUnchanged) {
        for (const item of data.items) {
            const vendorName = item.vendorName || "CIBINONG";`
);

// Close Phase 3 block
code = code.replace(
    /let grossAmount = 0;/,
    `}\n\n        let grossAmount = 0;`
);

// 4. Wrap Phase 3c (re-allocate lots)
code = code.replace(
    /\/\/ ─── FASE 3c: Re-allocate Lots for the updated items ────────────/,
    `if (!isItemsUnchanged) {\n        // ─── FASE 3c: Re-allocate Lots for the updated items ────────────`
);

// Close Phase 3c block
code = code.replace(
    /\/\/ ────────────────────────────────────────────────────────────────/,
    `// ────────────────────────────────────────────────────────────────\n        }`
);

fs.writeFileSync(path, code);
console.log("Patched successfully");
