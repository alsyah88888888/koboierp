const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/actions.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix isAdmin and add prefix
content = content.replace(
    /const isAdmin = session\.user\.role === "ADMIN";/g,
    'const isAdmin = session.user.role?.toUpperCase() === "ADMIN";\n    const prefix = session.user.prefix || null;'
);

// 2. Fix Stock aggregation
content = content.replace(
    /where: isAdmin \? {} : { product: { is: { createdById: session\.user\.id } } },/g,
    `where: isAdmin ? {} : { 
                OR: [
                    { product: { is: { createdById: session.user.id } } },
                    { product: { is: { createdById: null } } }
                ]
            },`
);

// 3. Fix SalesDelivery aggregation (and any other salesPerson: "BC")
content = content.replace(
    /where: isAdmin \? {} : { salesPerson: "BC" },/g,
    `where: isAdmin ? {} : { 
                OR: [
                    { salesPerson: prefix },
                    { salesPerson: null }
                ]
            },`
);

// 4. Fix other salesFilter instances
content = content.replace(
    /const salesFilter = isAdmin \? {} : { salesPerson: "BC" };/g,
    `const salesFilter = isAdmin ? {} : { 
        OR: [
            { salesPerson: prefix },
            { salesPerson: null }
        ]
    };`
);

fs.writeFileSync(filePath, content);
console.log('Successfully patched actions.ts');
