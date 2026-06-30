
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

        return { success: true };
    }, { timeout: 30000 });

    try {
        revalidatePath("/finance");
        revalidatePath("/");
        revalidatePath("/purchase");
        revalidatePath("/sales");
    } catch (e) {
        console.error("revalidatePath error:", e);
    }

    return { success: true };
}

export async function createFinanceTransactionService(data: any, userId: string) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    const result = await prisma.$transaction(async (tx: any) => {
        const now = new Date();
        const txDate = new Date(data.date);
        if (txDate.toDateString() === now.toDateString()) {
            txDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
        }

        let salesPerson = data.salesPerson || null;
        let invoiceNumber = data.invoiceNumber || null;

        if (data.referenceNumber && !invoiceNumber) {
            const cleanedRef = data.referenceNumber.trim();
            // Search in SalesDelivery
            const delivery = await tx.salesDelivery.findFirst({
                where: {
                    OR: [
                        { deliveryNumber: { equals: cleanedRef, mode: 'insensitive' } },
                        { invoiceNumber: { equals: cleanedRef, mode: 'insensitive' } }
                    ],
                    isVoid: false
                },
                select: { salesPerson: true, invoiceNumber: true, deliveryNumber: true }
            });
            if (delivery) {
                salesPerson = delivery.salesPerson || null;
                invoiceNumber = delivery.invoiceNumber || delivery.deliveryNumber;
            } else {
                // Search in SalesOrder
                const order = await tx.salesOrder.findFirst({
                    where: {
                        OR: [
                            { orderNumber: { equals: cleanedRef, mode: 'insensitive' } },
                            { invoiceNumber: { equals: cleanedRef, mode: 'insensitive' } }
                        ]
                    },
                    select: { salesPerson: true, invoiceNumber: true, orderNumber: true }
                });
                if (order) {
                    salesPerson = order.salesPerson || null;
                    invoiceNumber = order.invoiceNumber || order.orderNumber;
                }
            }
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
                salesPerson: salesPerson,
                invoiceNumber: invoiceNumber,
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

        return { success: true, transactionId: transaction.id };
    }, { timeout: 30000 });

    try {
        revalidatePath("/finance");
        revalidatePath("/");
    } catch (e) {
        console.error("revalidatePath error:", e);
    }

    return result;
}

export async function updateFinanceTransactionService(id: string, data: any, userId: string) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    const result = await prisma.$transaction(async (tx: any) => {
        // 1. Get old transaction
        const oldTx = await tx.financeTransaction.findUnique({
            where: { id },
            select: { receiptNumber: true, amount: true, transactionType: true }
        });

        // 2. Revert old Landed Cost if linked to purchase
        if (oldTx && oldTx.receiptNumber && oldTx.transactionType === "PAYMENT") {
            const goodsReceipt = await tx.goodsReceipt.findUnique({
                where: { receiptNumber: oldTx.receiptNumber },
                include: { items: true }
            });
            if (goodsReceipt && goodsReceipt.items.length > 0) {
                const totalQty = goodsReceipt.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
                if (totalQty > 0) {
                    const extraCostPerUnit = Number(oldTx.amount) / totalQty;
                    const lots = await tx.productLot.findMany({
                        where: { grNumber: oldTx.receiptNumber }
                    });
                    for (const lot of lots) {
                        const currentLandedCost = Number(lot.landedCost || lot.purchasePrice);
                        await tx.productLot.update({
                            where: { id: lot.id },
                            data: {
                                landedCost: Math.max(Number(lot.purchasePrice), currentLandedCost - extraCostPerUnit)
                            }
                        });
                    }
                }
            }
        }

        // Determine date
        const now = new Date();
        const txDate = new Date(data.date);
        if (txDate.toDateString() === now.toDateString()) {
            txDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
        }

        let salesPerson = data.salesPerson || null;
        let invoiceNumber = data.invoiceNumber || null;

        if (data.referenceNumber && !invoiceNumber) {
            const cleanedRef = data.referenceNumber.trim();
            const delivery = await tx.salesDelivery.findFirst({
                where: {
                    OR: [
                        { deliveryNumber: { equals: cleanedRef, mode: 'insensitive' } },
                        { invoiceNumber: { equals: cleanedRef, mode: 'insensitive' } }
                    ],
                    isVoid: false
                },
                select: { salesPerson: true, invoiceNumber: true, deliveryNumber: true }
            });
            if (delivery) {
                salesPerson = delivery.salesPerson || null;
                invoiceNumber = delivery.invoiceNumber || delivery.deliveryNumber;
            } else {
                const order = await tx.salesOrder.findFirst({
                    where: {
                        OR: [
                            { orderNumber: { equals: cleanedRef, mode: 'insensitive' } },
                            { invoiceNumber: { equals: cleanedRef, mode: 'insensitive' } }
                        ]
                    },
                    select: { salesPerson: true, invoiceNumber: true, orderNumber: true }
                });
                if (order) {
                    salesPerson = order.salesPerson || null;
                    invoiceNumber = order.invoiceNumber || order.orderNumber;
                }
            }
        }

        // 3. Update the FinanceTransaction
        const transaction = await tx.financeTransaction.update({
            where: { id },
            data: {
                transactionType: data.transactionType,
                bank: data.bank,
                date: txDate,
                referenceNumber: data.referenceNumber,
                description: data.description,
                amount: data.amount as any,
                salesPerson: salesPerson,
                invoiceNumber: invoiceNumber,
                receiptNumber: data.receiptNumber || null
            }
        });

        // 4. Apply new Landed Cost if linked to a Purchase Goods Receipt
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

        // 5. Delete old journal entries
        await tx.journalEntry.deleteMany({
            where: { transactionId: id }
        });

        // 6. Create new journal entries
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
                date: txDate,
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

        return { success: true };
    }, { timeout: 30000 });

    try {
        revalidatePath("/finance");
        revalidatePath("/");
    } catch (e) {
        console.error("revalidatePath error:", e);
    }

    return result;
}

export async function editSettledPaymentService(
    type: "PURCHASE" | "SALE",
    id: string,
    newPaidAmount: number,
    paymentDate?: Date,
    userId?: string,
    bankAccountId?: string
) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    const result = await prisma.$transaction(async (tx: any) => {
        if (type === "SALE") {
            // 1. Fetch SalesDelivery
            const delivery = await tx.salesDelivery.findUnique({
                where: { id },
                include: { items: true }
            });
            if (!delivery) throw new Error("Delivery not found");

            const reference = delivery.deliveryNumber;
            const party = delivery.buyerName;
            const totalAmount = Math.round(Number(delivery.grandTotal || 0));
            const previouslyPaid = Math.round(Number(delivery.paidAmount || 0));

            // 2. Find and delete previous payment journal entries
            const entriesToDelete = await tx.journalEntry.findMany({
                where: {
                    OR: [
                        { description: { startsWith: `Penerimaan Pelunasan Piutang: ${reference}` } },
                        { description: { startsWith: `Penyelesaian Piutang: ${reference}` } },
                        { description: { startsWith: `Penerimaan DP/Sebagian Piutang: ${reference}` } },
                        { description: { startsWith: `Penyelesaian Piutang (DP): ${reference}` } },
                        { description: { startsWith: `Kas Bank (Penjualan Tunai): ${reference}` } }
                    ]
                }
            });

            let wasDirectCashSale = false;
            for (const entry of entriesToDelete) {
                if (entry.description.startsWith(`Kas Bank (Penjualan Tunai): ${reference}`)) {
                    wasDirectCashSale = true;
                }
            }

            // Delete old entries
            if (entriesToDelete.length > 0) {
                await tx.journalEntry.deleteMany({
                    where: { id: { in: entriesToDelete.map((e: any) => e.id) } }
                });
            }

            // If it was a direct cash sale, we now turn it into a credit sale by recognizing the AR:
            if (wasDirectCashSale) {
                const arAccount = await tx.financeAccount.findUnique({ where: { code: '105' } });
                if (arAccount) {
                    await tx.journalEntry.create({
                        data: {
                            description: `Piutang Penjualan: ${reference} (${party})`,
                            amount: totalAmount as any,
                            type: "DEBIT",
                            accountId: arAccount.id,
                            date: delivery.date || new Date(),
                            createdById: userId
                        }
                    });
                }
            }

            // Revert customer balance: add back the previouslyPaid amount (making it unpaid again)
            const customer = await tx.customer.findFirst({ where: { name: party } });
            if (customer && previouslyPaid > 0) {
                await tx.customer.update({
                    where: { id: customer.id },
                    data: { balance: { increment: previouslyPaid } }
                });
            }

            // 3. Apply the new payment details (if newPaidAmount > 0)
            let newStatus = "CREDIT";
            let finalPaidAmount = 0;

            if (newPaidAmount > 0) {
                const toReceive = Math.round(Number(newPaidAmount));
                if (toReceive >= totalAmount) {
                    newStatus = "PAID";
                    finalPaidAmount = totalAmount;
                } else {
                    newStatus = "PARTIAL";
                    finalPaidAmount = toReceive;
                }

                const arAccount = await tx.financeAccount.findUnique({ where: { code: '105' } });
                const bankAccount = bankAccountId 
                    ? await tx.financeAccount.findUnique({ where: { id: bankAccountId } })
                    : await tx.financeAccount.findUnique({ where: { code: '102' } });

                if (bankAccount && arAccount && toReceive > 0) {
                    const instRecDate = paymentDate || new Date();
                    await tx.journalEntry.create({
                        data: {
                            description: `Penerimaan ${newStatus === "PARTIAL" ? "DP/Sebagian" : "Pelunasan"} Piutang: ${reference} (${party})`,
                            amount: toReceive as any,
                            type: "DEBIT",
                            accountId: bankAccount.id,
                            date: instRecDate,
                            createdById: userId
                        }
                    });
                    await tx.journalEntry.create({
                        data: {
                            description: `Penyelesaian Piutang: ${reference} (${party})`,
                            amount: toReceive as any,
                            type: "CREDIT",
                            accountId: arAccount.id,
                            date: instRecDate,
                            createdById: userId
                        }
                    });
                }

                // Update customer balance: decrement by the new paid amount
                if (customer && toReceive > 0) {
                    await tx.customer.update({
                        where: { id: customer.id },
                        data: { balance: { decrement: toReceive } }
                    });
                }
            }

            // 4. Update the SalesDelivery
            await tx.salesDelivery.update({
                where: { id },
                data: {
                    paymentStatus: newStatus as any,
                    paidAmount: finalPaidAmount
                }
            });

        } else if (type === "PURCHASE") {
            // 1. Fetch GoodsReceipt
            const receipt = await tx.goodsReceipt.findUnique({
                where: { id },
                include: { items: true }
            });
            if (!receipt) throw new Error("Receipt not found");

            const reference = receipt.receiptNumber;
            const party = receipt.receivedFrom;
            const totalAmount = Math.round(Number(receipt.grandTotal || 0));
            const previouslyPaid = Math.round(Number(receipt.paidAmount || 0));

            // 2. Find and delete previous payment journal entries
            const entriesToDelete = await tx.journalEntry.findMany({
                where: {
                    OR: [
                        { description: { startsWith: `Pembayaran DP Hutang: ${reference}` } },
                        { description: { startsWith: `Kas Bank (Keluar DP): ${reference}` } },
                        { description: { startsWith: `Pembayaran Sebagian Hutang: ${reference}` } },
                        { description: { startsWith: `Pembayaran Pelunasan Hutang: ${reference}` } },
                        { description: { startsWith: `Kas Bank (Keluar): ${reference}` } },
                        { description: { startsWith: `Pembelian Tunai (Bank): ${reference}` } }
                    ]
                }
            });

            let wasDirectCashPurchase = false;
            for (const entry of entriesToDelete) {
                if (entry.description.startsWith(`Pembelian Tunai (Bank): ${reference}`)) {
                    wasDirectCashPurchase = true;
                }
            }

            // Delete old entries
            if (entriesToDelete.length > 0) {
                await tx.journalEntry.deleteMany({
                    where: { id: { in: entriesToDelete.map((e: any) => e.id) } }
                });
            }

            // If it was a direct cash purchase, we now turn it into a credit purchase by recognizing the AP:
            if (wasDirectCashPurchase) {
                const apAccount = await tx.financeAccount.findUnique({ where: { code: '201' } });
                if (apAccount) {
                    await tx.journalEntry.create({
                        data: {
                            description: `Hutang Pembelian: ${reference} (${party})`,
                            amount: totalAmount as any,
                            type: "CREDIT",
                            accountId: apAccount.id,
                            date: receipt.date || new Date(),
                            createdById: userId
                        }
                    });
                }
            }

            // Reset paidAmount to 0 first to correctly sync vendor balance
            await tx.goodsReceipt.update({
                where: { id },
                data: {
                    paymentStatus: "CREDIT",
                    paidAmount: 0
                }
            });
            await syncVendorBalanceAfterPayment(tx, party);

            // 3. Apply the new payment details (if newPaidAmount > 0)
            let newStatus = "CREDIT";
            let finalPaidAmount = 0;

            if (newPaidAmount > 0) {
                const toPay = Math.round(Number(newPaidAmount));
                if (toPay >= totalAmount) {
                    newStatus = "PAID";
                    finalPaidAmount = totalAmount;
                } else {
                    newStatus = "PARTIAL";
                    finalPaidAmount = toPay;
                }

                const apAccount = await tx.financeAccount.findUnique({ where: { code: '201' } });
                const bankAccount = bankAccountId 
                    ? await tx.financeAccount.findUnique({ where: { id: bankAccountId } })
                    : await tx.financeAccount.findUnique({ where: { code: '102' } });

                if (apAccount && bankAccount && toPay > 0) {
                    const activePayDate = paymentDate || new Date();
                    await tx.journalEntry.create({
                        data: {
                            description: `Pembayaran ${newStatus === "PARTIAL" ? "DP/Sebagian" : "Pelunasan"} Hutang: ${reference} (${party})`,
                            amount: toPay as any,
                            type: "DEBIT",
                            accountId: apAccount.id,
                            date: activePayDate,
                            createdById: userId
                        }
                    });
                    await tx.journalEntry.create({
                        data: {
                            description: `Kas Bank (Keluar): ${reference} (${party})`,
                            amount: toPay as any,
                            type: "CREDIT",
                            accountId: bankAccount.id,
                            date: activePayDate,
                            createdById: userId
                        }
                    });
                }
            }

            // 4. Update the GoodsReceipt with final status & paidAmount
            await tx.goodsReceipt.update({
                where: { id },
                data: {
                    paymentStatus: newStatus as any,
                    paidAmount: finalPaidAmount
                }
            });
            await syncVendorBalanceAfterPayment(tx, party);
        }

        return { success: true };
    }, { timeout: 30000 });

    try {
        revalidatePath("/finance");
        revalidatePath("/");
        revalidatePath("/purchase");
        revalidatePath("/sales");
    } catch (e) {
        console.error("revalidatePath error (safe to ignore in non-request contexts):", e);
    }

    return result;
}

export async function updateGroupedPaymentStatusService(
    invoiceNumber: string,
    status: "PAID" | "CREDIT" | "PENDING" | "PARTIAL",
    partialAmount?: number,
    paymentDate?: Date,
    userId?: string,
    bankAccountId?: string
) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    const deliveries = await prisma.salesDelivery.findMany({
        where: { OR: [ { invoiceNumber: invoiceNumber }, { deliveryNumber: invoiceNumber } ], isVoid: false },
        orderBy: { createdAt: 'asc' }
    });

    if (deliveries.length === 0) throw new Error("No deliveries found for this invoice");

    if (status === "CREDIT") {
        for (const d of deliveries) {
            if (d.paymentStatus === "PENDING") {
                await updatePaymentStatusService("SALE", d.id, "CREDIT", undefined, paymentDate, userId, bankAccountId);
            }
        }
        return { success: true };
    }

    if (status === "PAID" && !partialAmount) {
        for (const d of deliveries) {
            if (d.paymentStatus !== "PAID") {
                await updatePaymentStatusService("SALE", d.id, "PAID", undefined, paymentDate, userId, bankAccountId);
            }
        }
        return { success: true };
    }

    if (status === "PARTIAL" || partialAmount) {
        let remainingToDistribute = Number(partialAmount) || 0;
        for (const d of deliveries) {
            if (remainingToDistribute <= 0) break;
            const amount = Math.round(Number(d.grandTotal || 0));
            const currentPaid = Math.round(Number(d.paidAmount || 0));
            const unpaid = amount - currentPaid;

            if (unpaid > 0) {
                const payForThis = Math.min(unpaid, remainingToDistribute);
                const newStatus = (payForThis === unpaid && d.paymentStatus !== "PENDING") ? "PAID" : "PARTIAL";
                await updatePaymentStatusService("SALE", d.id, newStatus, payForThis, paymentDate, userId, bankAccountId);
                remainingToDistribute -= payForThis;
            }
        }
        return { success: true };
    }

    return { success: true };
}
