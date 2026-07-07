const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  const insertPoint = /async function syncVendorBalanceAfterPayment/g;
  
  const customerSyncCode = `async function syncCustomerBalanceAfterPayment(tx: any, buyerName: string) {
    const deliveries = await tx.salesDelivery.findMany({
        where: { buyerName: buyerName, isVoid: false },
        select: { grandTotal: true, paidAmount: true, paymentStatus: true }
    });
    const correctBalance = deliveries.reduce((sum: number, r: any) => {
        if (r.paymentStatus !== "PAID") {
            return sum + Math.max(0, Number(r.grandTotal || 0) - Number(r.paidAmount || 0));
        }
        return sum;
    }, 0);
    const customer = await tx.customer.findFirst({ where: { name: buyerName } });
    if (customer) {
        await tx.customer.update({ where: { id: customer.id }, data: { balance: correctBalance } });
    }
}

`;

  content = content.replace(insertPoint, customerSyncCode + "async function syncVendorBalanceAfterPayment");
  fs.writeFileSync(filePath, content);
  console.log(`Added syncCustomerBalanceAfterPayment in ${filePath}`);
}

fixFile('src/lib/services/finance-service.ts');
