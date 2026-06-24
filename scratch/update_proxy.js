const fs = require('fs');
let content = fs.readFileSync('src/proxy.ts', 'utf8');

const targetProxy = `        case "getRecentSalesReferences":
            const { getRecentSalesReferencesAction } = await import("@/actions/finance");
            return await getRecentSalesReferencesAction();`;

const replaceProxy = `        case "getRecentSalesReferences":
            const { getRecentSalesReferencesAction } = await import("@/actions/finance");
            return await getRecentSalesReferencesAction();
        case "getRecentPurchaseReferences":
            const { getRecentPurchaseReferencesAction } = await import("@/actions/finance");
            return await getRecentPurchaseReferencesAction();`;

content = content.replace(targetProxy, replaceProxy);
fs.writeFileSync('src/proxy.ts', content);
console.log("Updated proxy.ts");
