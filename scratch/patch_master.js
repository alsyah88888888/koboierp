const fs = require('fs');
const file = 'src/actions/master.ts';
let content = fs.readFileSync(file, 'utf8');

// We can just add the logAction into the TRY block of createVendorAction, updateVendorAction, etc.
// But wait, the actions are super simple:
// export async function createVendorAction(data: any) { ... await prisma.vendor.create ... }
// I will just rewrite master.ts to include logAction.

content = content.replace(
    /await prisma\.vendor\.create\({/g,
    `const { logAction } = require("@/lib/audit"); await logAction({ userId: session?.user?.id, action: "CREATE_VENDOR", resource: "Vendor", details: data });\n        await prisma.vendor.create({`
);

content = content.replace(
    /await prisma\.vendor\.update\({ where: { id }, data }\);/g,
    `const { getAuthOptions } = require("@/lib/auth");\n    const { getServerSession } = require("next-auth");\n    const session = (await getServerSession(getAuthOptions())) as any;\n    const { logAction } = require("@/lib/audit");\n    await logAction({ userId: session?.user?.id, action: "UPDATE_VENDOR", resource: "Vendor", resourceId: id, details: data });\n    await prisma.vendor.update({ where: { id }, data });`
);

content = content.replace(
    /await prisma\.vendor\.delete\({ where: { id } }\);/g,
    `const { getAuthOptions } = require("@/lib/auth");\n    const { getServerSession } = require("next-auth");\n    const session = (await getServerSession(getAuthOptions())) as any;\n    const { logAction } = require("@/lib/audit");\n    await logAction({ userId: session?.user?.id, action: "DELETE_VENDOR", resource: "Vendor", resourceId: id });\n    await prisma.vendor.delete({ where: { id } });`
);

content = content.replace(
    /await prisma\.customer\.create\({/g,
    `const { logAction } = require("@/lib/audit"); await logAction({ userId: session?.user?.id, action: "CREATE_CUSTOMER", resource: "Customer", details: data });\n        await prisma.customer.create({`
);

content = content.replace(
    /await prisma\.customer\.update\({ where: { id }, data }\);/g,
    `const { getAuthOptions } = require("@/lib/auth");\n    const { getServerSession } = require("next-auth");\n    const session = (await getServerSession(getAuthOptions())) as any;\n    const { logAction } = require("@/lib/audit");\n    await logAction({ userId: session?.user?.id, action: "UPDATE_CUSTOMER", resource: "Customer", resourceId: id, details: data });\n    await prisma.customer.update({ where: { id }, data });`
);

content = content.replace(
    /await prisma\.customer\.delete\({ where: { id } }\);/g,
    `const { getAuthOptions } = require("@/lib/auth");\n    const { getServerSession } = require("next-auth");\n    const session = (await getServerSession(getAuthOptions())) as any;\n    const { logAction } = require("@/lib/audit");\n    await logAction({ userId: session?.user?.id, action: "DELETE_CUSTOMER", resource: "Customer", resourceId: id });\n    await prisma.customer.delete({ where: { id } });`
);

content = content.replace(
    /await prisma\.warehouse\.create\({/g,
    `const { logAction } = require("@/lib/audit"); await logAction({ userId: session?.user?.id, action: "CREATE_WAREHOUSE", resource: "Warehouse", details: data });\n        await prisma.warehouse.create({`
);

content = content.replace(
    /await prisma\.warehouse\.update\({ where: { id }, data }\);/g,
    `const { getAuthOptions } = require("@/lib/auth");\n    const { getServerSession } = require("next-auth");\n    const session = (await getServerSession(getAuthOptions())) as any;\n    const { logAction } = require("@/lib/audit");\n    await logAction({ userId: session?.user?.id, action: "UPDATE_WAREHOUSE", resource: "Warehouse", resourceId: id, details: data });\n    await prisma.warehouse.update({ where: { id }, data });`
);

content = content.replace(
    /await prisma\.warehouse\.delete\({ where: { id } }\);/g,
    `const { getAuthOptions } = require("@/lib/auth");\n    const { getServerSession } = require("next-auth");\n    const session = (await getServerSession(getAuthOptions())) as any;\n    const { logAction } = require("@/lib/audit");\n    await logAction({ userId: session?.user?.id, action: "DELETE_WAREHOUSE", resource: "Warehouse", resourceId: id });\n    await prisma.warehouse.delete({ where: { id } });`
);

fs.writeFileSync(file, content);
console.log("Patched master.ts");
