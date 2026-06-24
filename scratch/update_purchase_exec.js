const fs = require('fs');
let content = fs.readFileSync('src/lib/services/purchase-service.ts', 'utf8');

const targetExec = `        // 1. Create Finance Transaction
        const transaction = await tx.financeTransaction.create({
            data: {
                transactionType: "PAYMENT",
                bank: paymentData.bank,
                date: new Date(),
                referenceNumber: pr.number,
                description: \`Payment for PR: \${pr.number} - \${pr.notes || ""}\`,
                amount: totalAmount,
                category: pr.category,
                createdById: userId
            }
        });`;

const replaceExec = `        // 1. Create Finance Transaction
        const transaction = await tx.financeTransaction.create({
            data: {
                transactionType: "PAYMENT",
                bank: paymentData.bank,
                date: new Date(),
                referenceNumber: pr.number,
                description: \`Payment for PR: \${pr.number} - \${pr.notes || ""}\`,
                amount: totalAmount,
                category: pr.category,
                salesPerson: pr.salesPerson,
                invoiceNumber: pr.invoiceNumber,
                receiptNumber: pr.receiptNumber,
                createdById: userId
            }
        });`;

content = content.replace(targetExec, replaceExec);
fs.writeFileSync('src/lib/services/purchase-service.ts', content);
console.log("Updated purchase-service.ts executePurchaseRequest");
