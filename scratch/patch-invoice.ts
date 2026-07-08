import fs from 'fs';
const file = 'src/app/purchase/print/invoice/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf-8');
const lines = content.split('\n');
lines[98] = lines[98].replace('formatCurrency(Number(item.purchasePrice))', 'formatCurrency(Math.round(Number(item.purchasePrice)))');
lines[99] = lines[99].replace('formatCurrency(Number(item.quantity) * Number(item.purchasePrice))', 'formatCurrency(Math.round(Number(item.quantity) * Number(item.purchasePrice)))');
fs.writeFileSync(file, lines.join('\n'), 'utf-8');
