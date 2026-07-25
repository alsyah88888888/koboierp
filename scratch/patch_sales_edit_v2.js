const fs = require('fs');
const path = '/Users/alsyah/Documents/erp/src/lib/services/sales-service.ts';
let code = fs.readFileSync(path, 'utf8');

// Find index of updateSalesDeliveryService
const funcIndex = code.indexOf('export async function updateSalesDeliveryService');
if (funcIndex === -1) throw new Error("Function not found");

const codeBefore = code.slice(0, funcIndex);
let targetCode = code.slice(funcIndex);

targetCode = targetCode.replace(
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

targetCode = targetCode.replace(
    /await tx\.salesDeliveryItem\.deleteMany\(\{ where: \{ deliveryId: id \} \}\);/,
    `await tx.salesDeliveryItem.deleteMany({ where: { deliveryId: id } });
        } else {
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

targetCode = targetCode.replace(
    /for \(const item of data\.items\) \{\n\s+const vendorName = item\.vendorName \|\| "CIBINONG";/,
    `if (!isItemsUnchanged) {
        for (const item of data.items) {
            const vendorName = item.vendorName || "CIBINONG";`
);

targetCode = targetCode.replace(
    /let grossAmount = 0;/,
    `}\n\n        let grossAmount = 0;`
);

targetCode = targetCode.replace(
    /\/\/ ─── FASE 3c: Re-allocate Lots for the updated items ────────────/,
    `if (!isItemsUnchanged) {\n        // ─── FASE 3c: Re-allocate Lots for the updated items ────────────`
);

targetCode = targetCode.replace(
    /\/\/ ────────────────────────────────────────────────────────────────/,
    `// ────────────────────────────────────────────────────────────────\n        }`
);

fs.writeFileSync(path, codeBefore + targetCode);
console.log("Patched successfully");
