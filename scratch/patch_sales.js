const fs = require('fs');
const file = 'src/actions/sales.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /return await createSalesDeliveryService\(data, session\?\.user\?\.id\);/g,
    `const { logAction } = require("@/lib/audit");\n    await logAction({ userId: session?.user?.id, action: "CREATE_SALES_DELIVERY", resource: "SalesDelivery", details: data });\n    return await createSalesDeliveryService(data, session?.user?.id);`
);

content = content.replace(
    /return await updateSalesDeliveryService\(id, data, session\?\.user\?\.id\);/g,
    `const { logAction } = require("@/lib/audit");\n    await logAction({ userId: session?.user?.id, action: "UPDATE_SALES_DELIVERY", resource: "SalesDelivery", resourceId: id, details: data });\n    return await updateSalesDeliveryService(id, data, session?.user?.id);`
);

content = content.replace(
    /return await deleteSalesDeliveryService\(id\);/g,
    `const { logAction } = require("@/lib/audit");\n    await logAction({ userId: session?.user?.id, action: "DELETE_SALES_DELIVERY", resource: "SalesDelivery", resourceId: id });\n    return await deleteSalesDeliveryService(id);`
);

content = content.replace(
    /return await voidSalesDeliveryService\(id, reason\);/g,
    `const { logAction } = require("@/lib/audit");\n    await logAction({ userId: session?.user?.id, action: "VOID_SALES_DELIVERY", resource: "SalesDelivery", resourceId: id, details: { reason } });\n    return await voidSalesDeliveryService(id, reason);`
);

content = content.replace(
    /return await createSalesOrderService\(data, session\?\.user\?\.id\);/g,
    `const { logAction } = require("@/lib/audit");\n    await logAction({ userId: session?.user?.id, action: "CREATE_SALES_ORDER", resource: "SalesOrder", details: data });\n    return await createSalesOrderService(data, session?.user?.id);`
);

content = content.replace(
    /return await updateSalesOrderService\(id, data\);/g,
    `const { logAction } = require("@/lib/audit");\n    await logAction({ userId: session?.user?.id, action: "UPDATE_SALES_ORDER", resource: "SalesOrder", resourceId: id, details: data });\n    return await updateSalesOrderService(id, data);`
);

content = content.replace(
    /return await deleteSalesOrderService\(id\);/g,
    `const { logAction } = require("@/lib/audit");\n    await logAction({ userId: session?.user?.id, action: "DELETE_SALES_ORDER", resource: "SalesOrder", resourceId: id });\n    return await deleteSalesOrderService(id);`
);

fs.writeFileSync(file, content);
console.log("Patched sales.ts");
