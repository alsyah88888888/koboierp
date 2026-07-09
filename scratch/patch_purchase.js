const fs = require('fs');
const file = 'src/actions/purchase.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /return await createGoodsReceiptService\(data, session\?\.user\?\.id\);/g,
    `const { logAction } = require("@/lib/audit");\n    await logAction({ userId: session?.user?.id, action: "CREATE_GOODS_RECEIPT", resource: "GoodsReceipt", details: data });\n    return await createGoodsReceiptService(data, session?.user?.id);`
);

content = content.replace(
    /return await updateGoodsReceiptService\(id, data, session\?\.user\?\.id\);/g,
    `const { logAction } = require("@/lib/audit");\n    await logAction({ userId: session?.user?.id, action: "UPDATE_GOODS_RECEIPT", resource: "GoodsReceipt", resourceId: id, details: data });\n    return await updateGoodsReceiptService(id, data, session?.user?.id);`
);

content = content.replace(
    /return await deleteGoodsReceiptService\(id\);/g,
    `const { logAction } = require("@/lib/audit");\n    await logAction({ userId: session?.user?.id, action: "DELETE_GOODS_RECEIPT", resource: "GoodsReceipt", resourceId: id });\n    return await deleteGoodsReceiptService(id);`
);

content = content.replace(
    /return await voidGoodsReceiptService\(id, reason\);/g,
    `const { logAction } = require("@/lib/audit");\n    await logAction({ userId: session?.user?.id, action: "VOID_GOODS_RECEIPT", resource: "GoodsReceipt", resourceId: id, details: { reason } });\n    return await voidGoodsReceiptService(id, reason);`
);

content = content.replace(
    /return await createPurchaseOrderService\(data, session\?\.user\?\.id\);/g,
    `const { logAction } = require("@/lib/audit");\n    await logAction({ userId: session?.user?.id, action: "CREATE_PURCHASE_ORDER", resource: "PurchaseOrder", details: data });\n    return await createPurchaseOrderService(data, session?.user?.id);`
);

fs.writeFileSync(file, content);
console.log("Patched purchase.ts");
