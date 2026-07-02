const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/actions/sales.ts');
let content = fs.readFileSync(filePath, 'utf8');

const target = `                OR: [
                    { remainingQty: { gt: 0 } },
                    ...(includeLotId ? [{ id: includeLotId }] : [])
                ]`;
const replacement = `                // Allow selecting any lot (even if remainingQty <= 0) to allow manual HPP correction
                // We order by grDate descending to show most recent lots first
                // OR: [
                //     { remainingQty: { gt: 0 } },
                //     ...(includeLotId ? [{ id: includeLotId }] : [])
                // ]`;

const targetOrder = `orderBy: { grDate: 'asc' },`;
const replacementOrder = `orderBy: { grDate: 'desc' },
            take: 50, // Limit to last 50 lots to avoid performance issues`;

content = content.replace(target, replacement);
content = content.replace(targetOrder, replacementOrder);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Patched getAvailableLotsForProductAction");
