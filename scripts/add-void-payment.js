const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  const insertPoint = /export async function updatePaymentStatusService/g;
  
  const voidServiceCode = `export async function voidPaymentStatusService(
    type: "PURCHASE" | "SALE", 
    id: string,
    userId?: string
) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    return await prisma.$transaction(async (tx: any) => {
        let reference = "";
        let party = "";

        if (type === "PURCHASE") {
            const receipt = await tx.goodsReceipt.findUnique({ where: { id } });
            if (!receipt) throw new Error("Receipt not found");
            reference = receipt.receiptNumber;
            party = receipt.receivedFrom;

            await tx.goodsReceipt.update({
                where: { id },
                data: { paymentStatus: "PENDING", paidAmount: 0 }
            });
            await syncVendorBalanceAfterPayment(tx, party);
        } else {
            const delivery = await tx.salesDelivery.findUnique({ where: { id } });
            if (!delivery) throw new Error("Delivery not found");
            reference = delivery.deliveryNumber;
            party = delivery.buyerName;

            await tx.salesDelivery.update({
                where: { id },
                data: { paymentStatus: "PENDING", paidAmount: 0 }
            });
            await syncCustomerBalanceAfterPayment(tx, party);
        }

        // Delete related Journal Entries
        await tx.journalEntry.deleteMany({
            where: { description: { contains: reference } }
        });

        // Delete related Finance Transactions
        await tx.financeTransaction.deleteMany({
            where: { 
                OR: [
                    { referenceNumber: reference },
                    { invoiceNumber: reference },
                    { receiptNumber: reference }
                ]
            }
        });

        return { success: true, message: \`Pelunasan untuk \${reference} telah dibatalkan.\` };
    });
}

`;

  content = content.replace(insertPoint, voidServiceCode + "export async function updatePaymentStatusService");
  fs.writeFileSync(filePath, content);
  console.log(`Added voidPaymentStatusService in ${filePath}`);
}

fixFile('src/lib/services/finance-service.ts');
