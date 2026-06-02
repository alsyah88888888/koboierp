
import { revalidatePath } from "next/cache";

/**
 * FINANCE SERVICES
 * Strictly server-side logic for finance operations.
 */

async function syncVendorBalanceAfterPayment(tx: any, vendorName: string) {
    const receipts = await tx.goodsReceipt.findMany({
        where: { receivedFrom: vendorName, isVoid: false },
        select: { grandTotal: true, paidAmount: true, paymentStatus: true }
    });
    const correctBalance = receipts.reduce((sum: number, r: any) => {
        if (r.paymentStatus !== "PAID") {
            return sum + Math.max(0, Number(r.grandTotal || 0) - Number(r.paidAmount || 0));
        }
        return sum;
    }, 0);
    const vendor = await tx.vendor.findFirst({ where: { name: vendorName } });
    if (vendor) {
        await tx.vendor.update({ where: { id: vendor.id }, data: { balance: correctBalance } });
    }
}

export async function updatePaymentStatusService(
    type: "PURCHASE" | "SALE", 
    id: string, 
    status: "PAID" | "CREDIT" | "PENDING" | "PARTIAL", 
    partialAmount?: number, 
    paymentDate?: Date,
    userId?: string,
    bankAccountId?: string
) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    return await prisma.$transaction(async (tx: any) => {
        let reference = "";
        let amount = 0;
        let party = "";

        if (type === "PURCHASE") {
            const receipt = await tx.goodsReceipt.findUnique({
                where: { id },
                include: { items: true }
            });
            if (!receipt) throw new Error("Receipt not found");

            const previousStatus = receipt.paymentStatus;
            if (previousStatus === status && !partialAmount) return { success: true };

            reference = receipt.receiptNumber;
            party = receipt.receivedFrom;
            amount = Math.round(Number(receipt.grandTotal || 0));
            const currentPaid = Math.round(Number(receipt.paidAmount || 0));
            const toPay = partialAmount ? Math.round(Number(partialAmount)) : (status === "PAID" ? amount - currentPaid : 0);

            let newStatus = status;
            if ((status === "PAID" || status === "PARTIAL") && currentPaid + toPay < amount) {
                newStatus = "PARTIAL";
            } else if (status === "PAID" || (status === "PARTIAL" && currentPaid + toPay >= amount)) {
                newStatus = "PAID";
            }

            await tx.goodsReceipt.update({
                where: { id },
                data: {
                    paymentStatus: newStatus as any,
                    paidAmount: { increment: toPay }
                }
            });

            const invAccount = await tx.financeAccount.findUnique({ where: { code: '104' } });
            const bankAccount = bankAccountId 
                ? await tx.financeAccount.findUnique({ where: { id: bankAccountId } })
                : await tx.financeAccount.findUnique({ where: { code: '102' } });
            const apAccount = await tx.financeAccount.findUnique({ where: { code: '201' } });
            const taxAccount = await tx.financeAccount.findUnique({ where: { code: '106' } });
            const discAccount = await tx.financeAccount.findUnique({ where: { code: '502' } });

            if (previousStatus === "PENDING" && (status === "CREDIT" || status === "PARTIAL")) {
                if (invAccount && apAccount) {
                    const subtotal = Math.round(Number(receipt.subtotal || 0));
                    const totalDiscount = Math.round(Number(receipt.totalDiscount || 0));
                    const taxAmount = Math.round(Number(receipt.taxAmount || 0));
                    const finalGrandTotal = Math.round(Number(receipt.grandTotal || 0));

                    const txPaymentDate = paymentDate || new Date();
                    await tx.journalEntry.create({ data: { description: `Persediaan (Hutang): ${reference} (${party})`, amount: subtotal as any, type: "DEBIT", accountId: invAccount.id, date: txPaymentDate, createdById: userId } });
                    await tx.journalEntry.create({ data: { description: `Hutang Pembelian: ${reference} (${party})`, amount: finalGrandTotal as any, type: "CREDIT", accountId: apAccount.id, date: txPaymentDate, createdById: userId } });

                    if (taxAccount && taxAmount > 0) {
                        await tx.journalEntry.create({ data: { description: `PPN Masukan: ${reference}`, amount: taxAmount as any, type: "DEBIT", accountId: taxAccount.id, date: txPaymentDate, createdById: userId } });
                    }
                    if (discAccount && totalDiscount > 0) {
                        await tx.journalEntry.create({ data: { description: `Potongan Pembelian: ${reference}`, amount: totalDiscount as any, type: "CREDIT", accountId: discAccount.id, date: txPaymentDate, createdById: userId } });
                    }
                }
                await syncVendorBalanceAfterPayment(tx, party);

                if (status === "PARTIAL" && toPay > 0 && apAccount && bankAccount) {
                    const dpDate = paymentDate || new Date();
                    await tx.journalEntry.create({ data: { description: `Pembayaran DP Hutang: ${reference} (${party})`, amount: toPay as any, type: "DEBIT", accountId: apAccount.id, date: dpDate, createdById: userId } });
                    await tx.journalEntry.create({ data: { description: `Kas Bank (Keluar DP): ${reference} (${party})`, amount: toPay as any, type: "CREDIT", accountId: bankAccount.id, date: dpDate, createdById: userId } });
                    await syncVendorBalanceAfterPayment(tx, party);
                }
            } else if (previousStatus === "PENDING" && status === "PAID") {
                if (invAccount && bankAccount) {
                    const subtotal = Math.round(Number(receipt.subtotal || 0));
                    const totalDiscount = Math.round(Number(receipt.totalDiscount || 0));
                    const taxAmount = Math.round(Number(receipt.taxAmount || 0));
                    const finalGrandTotal = Math.round(Number(receipt.grandTotal || 0));

                    const payDate = paymentDate || new Date();
                    await tx.journalEntry.create({ data: { description: `Persediaan (Lunas Kas): ${reference} (${party})`, amount: subtotal as any, type: "DEBIT", accountId: invAccount.id, date: payDate, createdById: userId } });
                    await tx.journalEntry.create({ data: { description: `Pembelian Tunai (Bank): ${reference} (${party})`, amount: finalGrandTotal as any, type: "CREDIT", accountId: bankAccount.id, date: payDate, createdById: userId } });

                    if (taxAccount && taxAmount > 0) {
                        await tx.journalEntry.create({ data: { description: `PPN Masukan: ${reference}`, amount: taxAmount as any, type: "DEBIT", accountId: taxAccount.id, date: payDate, createdById: userId } });
                    }
                    if (discAccount && totalDiscount > 0) {
                        await tx.journalEntry.create({ data: { description: `Potongan Pembelian: ${reference}`, amount: totalDiscount as any, type: "CREDIT", accountId: discAccount.id, date: payDate, createdById: userId } });
                    }
                }
            } else if ((previousStatus === "CREDIT" || previousStatus === "PARTIAL") && (status === "PAID" || status === "PARTIAL")) {
                if (apAccount && bankAccount && toPay > 0) {
                    const activePayDate = paymentDate || new Date();
                    await tx.journalEntry.create({ data: { description: `Pembayaran ${status === "PARTIAL" ? "DP/Sebagian" : "Pelunasan"} Hutang: ${reference} (${party})`, amount: toPay as any, type: "DEBIT", accountId: apAccount.id, date: activePayDate, createdById: userId } });
                    await tx.journalEntry.create({ data: { description: `Kas Bank (Keluar): ${reference} (${party})`, amount: toPay as any, type: "CREDIT", accountId: bankAccount.id, date: activePayDate, createdById: userId } });
                }
                await syncVendorBalanceAfterPayment(tx, party);
            }

        } else {
            const delivery = await tx.salesDelivery.findUnique({
                where: { id },
                include: { items: true }
            });
            if (!delivery) throw new Error("Delivery not found");

            const previousStatus = delivery.paymentStatus;
            if (previousStatus === status && !partialAmount) return { success: true };

            reference = delivery.deliveryNumber;
            party = delivery.buyerName;

            const deliveryRaw: any[] = await tx.$queryRawUnsafe(`SELECT "grandTotal", "taxAmount", "totalDiscount", "paidAmount" FROM "SalesDelivery" WHERE id = $1`, id);
            amount = Math.round(Number(deliveryRaw[0]?.grandTotal || 0));
            const currentPaid = Math.round(Number(deliveryRaw[0]?.paidAmount || 0));
            const toReceive = partialAmount ? Math.round(Number(partialAmount)) : (status === "PAID" ? amount - currentPaid : 0);

            const taxAmountValue = Math.round(Number(deliveryRaw[0]?.taxAmount || 0));
            const totalDiscountNominal = Math.round(Number(deliveryRaw[0]?.totalDiscount || 0));

            let newStatus = status;
            if ((status === "PAID" || status === "PARTIAL") && currentPaid + toReceive < amount) {
                newStatus = "PARTIAL";
            } else if (status === "PAID" || (status === "PARTIAL" && currentPaid + toReceive >= amount)) {
                newStatus = "PAID";
            }

            await tx.salesDelivery.update({
                where: { id },
                data: {
                    paymentStatus: newStatus as any,
                    paidAmount: { increment: toReceive }
                }
            });

            const arAccount = await tx.financeAccount.findUnique({ where: { code: '105' } });
            const bankAccount = bankAccountId 
                ? await tx.financeAccount.findUnique({ where: { id: bankAccountId } })
                : await tx.financeAccount.findUnique({ where: { code: '102' } });
            const salesAccount = await tx.financeAccount.findUnique({ where: { code: '401' } });
            const taxAccountRef = await tx.financeAccount.findUnique({ where: { code: '202' } });
            const discountAccount = await tx.financeAccount.findUnique({ where: { code: '402' } });

            const grossAmount = Math.round(delivery.items.reduce((sum: number, i: any) => sum + (i.quantity * Number(i.salesPrice)), 0));
            let totalItemDiscounts = 0;
            delivery.items.forEach((i: any) => {
                totalItemDiscounts += Math.round(Number(i.discount) || 0);
            });
            const totalAllDiscounts = Math.round(totalItemDiscounts + totalDiscountNominal);

            if (previousStatus === "PENDING" && (status === "CREDIT" || status === "PARTIAL")) {
                if (arAccount && salesAccount) {
                    const txRecogDate = paymentDate || new Date();
                    await tx.journalEntry.create({ data: { description: `Piutang Penjualan: ${reference} (${party})`, amount: amount as any, type: "DEBIT", accountId: arAccount.id, date: txRecogDate, createdById: userId } });
                    await tx.journalEntry.create({ data: { description: `Pendapatan Penjualan: ${reference}`, amount: grossAmount as any, type: "CREDIT", accountId: salesAccount.id, date: txRecogDate, createdById: userId } });

                    if (discountAccount && totalAllDiscounts > 0) {
                        await tx.journalEntry.create({ data: { description: `Potongan Penjualan: ${reference}`, amount: totalAllDiscounts as any, type: "DEBIT", accountId: discountAccount.id, date: txRecogDate, createdById: userId } });
                    }
                    if (taxAccountRef && taxAmountValue > 0) {
                        await tx.journalEntry.create({ data: { description: `PPN Keluaran: ${reference}`, amount: taxAmountValue as any, type: "CREDIT", accountId: taxAccountRef.id, date: txRecogDate, createdById: userId } });
                    }
                }
                const customer = await tx.customer.findFirst({ where: { name: party } });
                if (customer) {
                    await tx.customer.update({ where: { id: customer.id }, data: { balance: { increment: amount } } });
                }

                if (status === "PARTIAL" && toReceive > 0 && arAccount && bankAccount) {
                    const dpRecDate = paymentDate || new Date();
                    await tx.journalEntry.create({ data: { description: `Kas Bank (Terima DP): ${reference} (${party})`, amount: toReceive as any, type: "DEBIT", accountId: bankAccount.id, date: dpRecDate, createdById: userId } });
                    await tx.journalEntry.create({ data: { description: `Penyelesaian Piutang (DP): ${reference} (${party})`, amount: toReceive as any, type: "CREDIT", accountId: arAccount.id, date: dpRecDate, createdById: userId } });
                    const customerAgain = await tx.customer.findFirst({ where: { name: party } });
                    if (customerAgain) {
                        await tx.customer.update({ where: { id: customerAgain.id }, data: { balance: { decrement: toReceive } } });
                    }
                }
            } else if (previousStatus === "PENDING" && status === "PAID") {
                if (bankAccount && salesAccount) {
                    const fullRecDate = paymentDate || new Date();
                    await tx.journalEntry.create({ data: { description: `Kas Bank (Penjualan Tunai): ${reference} (${party})`, amount: amount as any, type: "DEBIT", accountId: bankAccount.id, date: fullRecDate, createdById: userId } });
                    await tx.journalEntry.create({ data: { description: `Pendapatan Penjualan: ${reference}`, amount: grossAmount as any, type: "CREDIT", accountId: salesAccount.id, date: fullRecDate, createdById: userId } });

                    if (discountAccount && totalAllDiscounts > 0) {
                        await tx.journalEntry.create({ data: { description: `Potongan Penjualan: ${reference}`, amount: totalAllDiscounts as any, type: "DEBIT", accountId: discountAccount.id, date: fullRecDate, createdById: userId } });
                    }
                    if (taxAccountRef && taxAmountValue > 0) {
                        await tx.journalEntry.create({ data: { description: `PPN Keluaran: ${reference}`, amount: taxAmountValue as any, type: "CREDIT", accountId: taxAccountRef.id, date: fullRecDate, createdById: userId } });
                    }
                }
            } else if ((previousStatus === "CREDIT" || previousStatus === "PARTIAL") && (status === "PAID" || status === "PARTIAL")) {
                if (bankAccount && arAccount && toReceive > 0) {
                    const instRecDate = paymentDate || new Date();
                    await tx.journalEntry.create({ data: { description: `Penerimaan ${status === "PARTIAL" ? "DP/Sebagian" : "Pelunasan"} Piutang: ${reference} (${party})`, amount: toReceive as any, type: "DEBIT", accountId: bankAccount.id, date: instRecDate, createdById: userId } });
                    await tx.journalEntry.create({ data: { description: `Penyelesaian Piutang: ${reference} (${party})`, amount: toReceive as any, type: "CREDIT", accountId: arAccount.id, date: instRecDate, createdById: userId } });
                }
                const customer = await tx.customer.findFirst({ where: { name: party } });
                if (customer && toReceive > 0) {
                    await tx.customer.update({ where: { id: customer.id }, data: { balance: { decrement: toReceive } } });
                }
            }
        }

        revalidatePath("/finance");
        revalidatePath("/");
        revalidatePath("/purchase");
        revalidatePath("/sales");

        return { success: true };
    }, { timeout: 30000 });
}

export async function createFinanceTransactionService(data: any, userId: string) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    return await prisma.$transaction(async (tx: any) => {
        const now = new Date();
        const txDate = new Date(data.date);
        if (txDate.toDateString() === now.toDateString()) {
            txDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
        }

        const transaction = await tx.financeTransaction.create({
            data: {
                transactionType: data.transactionType,
                bank: data.bank,
                date: txDate,
                referenceNumber: data.referenceNumber,
                description: data.description,
                amount: data.amount as any,
                createdById: userId,
                salesPerson: data.salesPerson,
                invoiceNumber: data.invoiceNumber || null,
                receiptNumber: data.receiptNumber || null
            }
        });

        // Allocating Landed Cost if linked to a Purchase Goods Receipt
        if (data.receiptNumber && data.transactionType === "PAYMENT") {
            const goodsReceipt = await tx.goodsReceipt.findUnique({
                where: { receiptNumber: data.receiptNumber },
                include: { items: true }
            });
            if (goodsReceipt && goodsReceipt.items.length > 0) {
                const totalQty = goodsReceipt.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
                if (totalQty > 0) {
                    const extraCostPerUnit = Number(data.amount) / totalQty;
                    const lots = await tx.productLot.findMany({
                        where: { grNumber: data.receiptNumber }
                    });
                    for (const lot of lots) {
                        const currentLandedCost = Number(lot.landedCost || lot.purchasePrice);
                        await tx.productLot.update({
                            where: { id: lot.id },
                            data: {
                                landedCost: currentLandedCost + extraCostPerUnit
                            }
                        });
                    }
                }
            }
        }

        const isPayment = data.transactionType === "PAYMENT";
        const isMutation = data.transactionType === "MUTATION";

        let typeTargetAccount = isPayment ? "DEBIT" : "CREDIT";
        let typeBankAccount = isPayment ? "CREDIT" : "DEBIT";

        if (isMutation) {
            typeTargetAccount = "DEBIT"; 
            typeBankAccount = "CREDIT";  
        }

        await tx.journalEntry.create({
            data: {
                description: data.description,
                amount: data.amount as any,
                type: typeTargetAccount as any,
                accountId: data.accountId,
                transactionId: transaction.id,
                date: data.date,
                createdById: userId
            }
        });

        if (data.bankAccountId) {
            await tx.journalEntry.create({
                data: {
                    description: `${data.transactionType}: ${data.bank} - ${data.referenceNumber || ''}`,
                    amount: data.amount as any,
                    type: typeBankAccount as any,
                    accountId: data.bankAccountId,
                    transactionId: transaction.id,
                    date: txDate,
                    createdById: userId
                }
            });
        }

        revalidatePath("/finance");
        revalidatePath("/");

        return { success: true, transactionId: transaction.id };
    }, { timeout: 30000 });
}
