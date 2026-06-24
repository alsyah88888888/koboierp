const fs = require('fs');
let content = fs.readFileSync('src/actions/finance.ts', 'utf8');

const newAction = `
export async function getRecentPurchaseReferencesAction() {
    const { getAuthOptions } = require("@/lib/auth");
    const { getServerSession } = require("next-auth");
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    const session = (await getServerSession(getAuthOptions())) as any;
    if (!session?.user?.id) throw new Error("Unauthorized");

    // Fetch recent LPB
    const receipts = await prisma.goodsReceipt.findMany({
        where: { isVerified: true },
        orderBy: { date: 'desc' },
        take: 2000,
        select: {
            receiptNumber: true,
            receivedFrom: true,
            date: true
        }
    });

    const results = receipts.map((d) => {
        return {
            receiptNumber: d.receiptNumber,
            supplierName: d.receivedFrom || "",
            date: d.date ? d.date.toISOString() : null,
            label: \`\${d.receiptNumber} - \${d.receivedFrom || "No Supplier"}\`
        };
    });

    return results;
}
`;

content += newAction;
fs.writeFileSync('src/actions/finance.ts', content);
console.log("Added getRecentPurchaseReferencesAction");
