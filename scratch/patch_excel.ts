import * as fs from 'fs';

function patchFile(file, isFinance) {
    let content = fs.readFileSync(file, 'utf8');
    
    const importMatch = content.includes('formatCurrency');
    if (!importMatch) {
        content = content.replace('import { formatNumber } from "@/lib/utils";', 'import { formatNumber, formatCurrency } from "@/lib/utils";');
        content = content.replace('import { cn, formatNumber } from "@/lib/utils";', 'import { cn, formatNumber, formatCurrency } from "@/lib/utils";');
        // if still not imported, add it
        if (!content.includes('formatCurrency')) {
            content = content.replace('import { cn } from "@/lib/utils";', 'import { cn, formatCurrency } from "@/lib/utils";');
        }
    }
    
    // Update the push with items
    content = content.replace(/'Estimasi Harga': i\.estimatedPrice \? Number\(i\.estimatedPrice\) : 0,\n\s*'Total Estimasi': i\.quantity \* \(i\.estimatedPrice \? Number\(i\.estimatedPrice\) : 0\)/g, "'Estimasi Harga': formatCurrency(i.estimatedPrice ? Number(i.estimatedPrice) : 0),\n                            'Total Estimasi': formatCurrency(i.quantity * (i.estimatedPrice ? Number(i.estimatedPrice) : 0))");

    fs.writeFileSync(file, content);
}

patchFile('src/app/finance/FinanceDashboard.tsx', true);
patchFile('src/app/purchase/request/PurchaseRequestDashboard.tsx', false);
