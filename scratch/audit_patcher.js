const fs = require('fs');
const path = require('path');

const actionsDir = path.join(__dirname, '../src/actions');

function patchFile(filename, replacements) {
    const filePath = path.join(actionsDir, filename);
    let content = fs.readFileSync(filePath, 'utf8');
    let patched = content;
    
    for (const rep of replacements) {
        if (!patched.includes(rep.search)) {
            console.warn(`WARNING: Search string not found in ${filename}:\n${rep.search.slice(0,50)}...`);
        }
        patched = patched.replace(rep.search, rep.replace);
    }
    
    fs.writeFileSync(filePath, patched);
    console.log(`Patched ${filename}`);
}

// 1. MASTER.TS
patchFile('master.ts', [
    {
        search: `    const session = (await getServerSession(getAuthOptions())) as any;\n    return await createProductService(data, session?.user?.id, session?.user?.role);`,
        replace: `    const session = (await getServerSession(getAuthOptions())) as any;\n    const { logAction } = require("@/lib/audit");\n    await logAction({ userId: session?.user?.id, action: "CREATE_PRODUCT", resource: "Product", details: data });\n    return await createProductService(data, session?.user?.id, session?.user?.role);`
    },
    {
        search: `    const session = (await getServerSession(getAuthOptions())) as any;\n    return await updateProductService(id, data, session?.user?.role);`,
        replace: `    const session = (await getServerSession(getAuthOptions())) as any;\n    const { logAction } = require("@/lib/audit");\n    await logAction({ userId: session?.user?.id, action: "UPDATE_PRODUCT", resource: "Product", resourceId: id, details: data });\n    return await updateProductService(id, data, session?.user?.role);`
    },
    {
        search: `        await prisma.product.delete({ where: { id } });`,
        replace: `        const { logAction } = require("@/lib/audit");\n        const { getAuthOptions } = require("@/lib/auth");\n        const { getServerSession } = require("next-auth");\n        const session = (await getServerSession(getAuthOptions())) as any;\n        await logAction({ userId: session?.user?.id, action: "DELETE_PRODUCT", resource: "Product", resourceId: id });\n        await prisma.product.delete({ where: { id } });`
    },
    {
        search: `    const session = (await getServerSession(getAuthOptions())) as any;\n    return await createVendorService(data, session?.user?.id, session?.user?.role);`,
        replace: `    const session = (await getServerSession(getAuthOptions())) as any;\n    const { logAction } = require("@/lib/audit");\n    await logAction({ userId: session?.user?.id, action: "CREATE_VENDOR", resource: "Vendor", details: data });\n    return await createVendorService(data, session?.user?.id, session?.user?.role);`
    },
    {
        search: `    const session = (await getServerSession(getAuthOptions())) as any;\n    return await updateVendorService(id, data, session?.user?.role);`,
        replace: `    const session = (await getServerSession(getAuthOptions())) as any;\n    const { logAction } = require("@/lib/audit");\n    await logAction({ userId: session?.user?.id, action: "UPDATE_VENDOR", resource: "Vendor", resourceId: id, details: data });\n    return await updateVendorService(id, data, session?.user?.role);`
    },
    {
        search: `        await prisma.vendor.delete({ where: { id } });`,
        replace: `        const { logAction } = require("@/lib/audit");\n        const { getAuthOptions } = require("@/lib/auth");\n        const { getServerSession } = require("next-auth");\n        const session = (await getServerSession(getAuthOptions())) as any;\n        await logAction({ userId: session?.user?.id, action: "DELETE_VENDOR", resource: "Vendor", resourceId: id });\n        await prisma.vendor.delete({ where: { id } });`
    },
    {
        search: `    const session = (await getServerSession(getAuthOptions())) as any;\n    return await createCustomerService(data, session?.user?.id, session?.user?.role);`,
        replace: `    const session = (await getServerSession(getAuthOptions())) as any;\n    const { logAction } = require("@/lib/audit");\n    await logAction({ userId: session?.user?.id, action: "CREATE_CUSTOMER", resource: "Customer", details: data });\n    return await createCustomerService(data, session?.user?.id, session?.user?.role);`
    },
    {
        search: `    const session = (await getServerSession(getAuthOptions())) as any;\n    return await updateCustomerService(id, data, session?.user?.role);`,
        replace: `    const session = (await getServerSession(getAuthOptions())) as any;\n    const { logAction } = require("@/lib/audit");\n    await logAction({ userId: session?.user?.id, action: "UPDATE_CUSTOMER", resource: "Customer", resourceId: id, details: data });\n    return await updateCustomerService(id, data, session?.user?.role);`
    },
    {
        search: `        await prisma.customer.delete({ where: { id } });`,
        replace: `        const { logAction } = require("@/lib/audit");\n        const { getAuthOptions } = require("@/lib/auth");\n        const { getServerSession } = require("next-auth");\n        const session = (await getServerSession(getAuthOptions())) as any;\n        await logAction({ userId: session?.user?.id, action: "DELETE_CUSTOMER", resource: "Customer", resourceId: id });\n        await prisma.customer.delete({ where: { id } });`
    }
]);

