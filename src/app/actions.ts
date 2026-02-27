"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

/**
 * Goods Receipt Actions (Penerimaan Barang)
 */
export async function createGoodsReceiptAction(data: {
    receiptNumber: string;
    receivedFrom: string;
    warehouseId: string;
    date?: Date;
    taxInvoiceDate?: Date;
    taxInvoiceNumber?: string;
    salesPerson?: string;
    items: { productId: string; quantity: number; purchasePrice: number; uom?: string }[];
}) {
    // Generate automatic Form Number (Form-YYYYMMDD-HHmmss-Random)
    const txDate = data.date || new Date();
    const now = new Date();
    const dateStr = txDate.toISOString().split('T')[0].replace(/-/g, '');
    const timeStr = now.getHours().toString().padStart(2, '0') +
        now.getMinutes().toString().padStart(2, '0') +
        now.getSeconds().toString().padStart(2, '0');
    const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const formNumber = `FORM-${dateStr}-${timeStr}-${randomSuffix}`;

    try {
        return await prisma.$transaction(async (tx: any) => {
            const receipt = await tx.goodsReceipt.create({
                data: {
                    receiptNumber: data.receiptNumber,
                    receivedFrom: data.receivedFrom,
                    date: txDate,
                    taxInvoiceDate: data.taxInvoiceDate,
                    taxInvoiceNumber: data.taxInvoiceNumber,
                    salesPerson: data.salesPerson,
                    formNumber: formNumber,
                    warehouseId: data.warehouseId,
                    items: {
                        create: data.items.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            purchasePrice: item.purchasePrice as any,
                            uom: item.uom
                        }))
                    }
                }
            });

            // --- AUTOMATIC STOCK UPDATE ON CREATE ---
            for (const item of data.items) {
                await tx.stock.upsert({
                    where: {
                        productId_warehouseId: {
                            productId: item.productId,
                            warehouseId: data.warehouseId
                        }
                    },
                    update: { quantity: { increment: item.quantity } },
                    create: {
                        productId: item.productId,
                        warehouseId: data.warehouseId,
                        quantity: item.quantity
                    }
                });

                await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        warehouseId: data.warehouseId,
                        quantity: item.quantity,
                        type: "GOODS_RECEIPT",
                        reference: data.receiptNumber
                    }
                });
            }

            // --- ACCRUAL JOURNAL ON CREATE (Inventory vs Accounts Payable) ---
            const totalValue = data.items.reduce((sum, item) => sum + (item.quantity * Number(item.purchasePrice)), 0);
            if (totalValue > 0) {
                const invAccount = await tx.financeAccount.findUnique({ where: { code: '104' } }); // Persediaan
                const apAccount = await tx.financeAccount.findUnique({ where: { code: '201' } }); // Hutang

                if (invAccount && apAccount) {
                    await tx.journalEntry.create({
                        data: {
                            description: `Persediaan (Hutang): ${data.receiptNumber} (${data.receivedFrom})`,
                            amount: totalValue as any,
                            type: "DEBIT",
                            accountId: invAccount.id,
                            date: txDate
                        }
                    });

                    await tx.journalEntry.create({
                        data: {
                            description: `Hutang Pembelian: ${data.receiptNumber} (${data.receivedFrom})`,
                            amount: totalValue as any,
                            type: "CREDIT",
                            accountId: apAccount.id,
                            date: txDate
                        }
                    });
                }
            }

            revalidatePath("/purchase");
            revalidatePath("/warehouse");
            revalidatePath("/finance");
            revalidatePath("/");

            return receipt;
        });
    } catch (error: any) {
        if (error.code === 'P2002') {
            const target = error.meta?.target || "";
            if (target.includes('receiptNumber')) {
                throw new Error(`Nomor Surat Jalan "${data.receiptNumber}" sudah terdaftar. Gunakan nomor lain.`);
            }
            if (target.includes('formNumber')) {
                throw new Error(`Terjadi tabrakan nomor FORM otomatis. Silakan coba simpan kembali.`);
            }
            throw new Error(`Data dengan nomor tersebut sudah ada. Harap gunakan nomor yang berbeda.`);
        }
        throw error;
    }
}

/**
 * UPDATE: Goods Receipt (Edit existing)
 */
export async function updateGoodsReceiptAction(id: string, data: {
    receiptNumber: string;
    receivedFrom: string;
    warehouseId: string;
    date?: Date;
    taxInvoiceDate?: Date;
    taxInvoiceNumber?: string;
    salesPerson?: string;
    items: { productId: string; quantity: number; purchasePrice: number; uom?: string }[];
}) {
    return await prisma.$transaction(async (tx: any) => {
        // 1. Check if verified. include items to adjust stock
        const existing = await tx.goodsReceipt.findUnique({
            where: { id },
            include: { items: true }
        });
        if (!existing) throw new Error("Receipt not found");
        if (existing.isVerified) throw new Error("Cannot edit verified receipt");

        // --- REVERSE OLD STOCK ---
        for (const item of existing.items) {
            await tx.stock.update({
                where: {
                    productId_warehouseId: {
                        productId: item.productId,
                        warehouseId: existing.warehouseId
                    }
                },
                data: { quantity: { decrement: item.quantity } }
            });
        }

        // 2. Update Header
        await tx.goodsReceipt.update({
            where: { id },
            data: {
                receiptNumber: data.receiptNumber,
                receivedFrom: data.receivedFrom,
                date: data.date,
                taxInvoiceDate: data.taxInvoiceDate,
                taxInvoiceNumber: data.taxInvoiceNumber,
                salesPerson: data.salesPerson,
                warehouseId: data.warehouseId,
            }
        });

        // 3. Update Items
        await tx.goodsReceiptItem.deleteMany({ where: { receiptId: id } });
        await tx.goodsReceiptItem.createMany({
            data: data.items.map(item => ({
                receiptId: id,
                productId: item.productId,
                quantity: item.quantity,
                purchasePrice: item.purchasePrice as any,
                uom: item.uom
            }))
        });

        // --- APPLY NEW STOCK ---
        for (const item of data.items) {
            await tx.stock.upsert({
                where: {
                    productId_warehouseId: {
                        productId: item.productId,
                        warehouseId: data.warehouseId
                    }
                },
                update: { quantity: { increment: item.quantity } },
                create: {
                    productId: item.productId,
                    warehouseId: data.warehouseId,
                    quantity: item.quantity
                }
            });
        }

        revalidatePath("/purchase");
        revalidatePath("/warehouse");

        return { success: true };
    });
}

/**
 * ADMIN GUDANG: Verify Goods Receipt (Finalize Stock & Accounting)
 */
export async function verifyGoodsReceiptAction(id: string, verifiedBy: string) {
    return await prisma.$transaction(async (tx: any) => {
        const receipt = await tx.goodsReceipt.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!receipt) throw new Error("Penerimaan barang tidak ditemukan.");
        if (receipt.isVerified) throw new Error("Penerimaan barang sudah diverifikasi.");

        // Stock is already updated during creation/input as per new requirement

        // Journal entries are now handled during creation (createGoodsReceiptAction)
        // because stock is also updated during creation. 
        // This ensures the books and the stock are always in sync.

        // 3. Mark as verified
        // Using raw execute because of client generation lock
        try {
            await tx.goodsReceipt.update({
                where: { id },
                data: {
                    isVerified: true,
                    verifiedAt: new Date(),
                    verifiedBy: verifiedBy
                }
            });
        } catch (e) {
            await tx.$executeRaw`UPDATE GoodsReceipt SET isVerified = 1, verifiedAt = CURRENT_TIMESTAMP, verifiedBy = ${verifiedBy} WHERE id = ${id}`;
        }

        revalidatePath("/purchase");
        revalidatePath("/warehouse");
        revalidatePath("/finance");
        revalidatePath("/");

        return { success: true };
    });
}

/**
 * ADMIN: Delete Goods Receipt
 */
export async function deleteGoodsReceiptAction(id: string) {
    return await prisma.$transaction(async (tx: any) => {
        const receipt = await tx.goodsReceipt.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!receipt) throw new Error("Receipt not found");

        // 1. Reverse Stock
        for (const item of receipt.items) {
            await tx.stock.update({
                where: {
                    productId_warehouseId: {
                        productId: item.productId,
                        warehouseId: receipt.warehouseId
                    }
                },
                data: { quantity: { decrement: item.quantity } }
            });

            await tx.stockMovement.create({
                data: {
                    productId: item.productId,
                    warehouseId: receipt.warehouseId,
                    quantity: -item.quantity,
                    type: "GOODS_RECEIPT_CANCEL",
                    reference: receipt.receiptNumber
                }
            });
        }

        // 2. Delete Journal Entries
        // We look for entries mentioning the receipt number
        await tx.journalEntry.deleteMany({
            where: {
                description: {
                    contains: receipt.receiptNumber
                }
            }
        });

        // 3. Delete the Receipt and Items
        await tx.goodsReceiptItem.deleteMany({ where: { receiptId: id } });
        await tx.goodsReceipt.delete({ where: { id } });

        revalidatePath("/purchase");
        revalidatePath("/warehouse");
        revalidatePath("/finance");
        revalidatePath("/");

        return { success: true };
    });
}

/**
 * Sales Delivery Actions (Penjualan)
 */
export async function createSalesDeliveryAction(data: {
    recipient: string;
    buyerName: string;
    warehouseId: string;
    salesPerson?: string;
    createdAt?: Date;
    items: { productId: string; quantity: number; salesPrice: number; uom?: string }[];
}) {
    // Generate automatic Delivery Number (SJ-YYYYMMDD-Random)
    const txDate = data.createdAt || new Date();
    const dateStr = txDate.toISOString().split('T')[0].replace(/-/g, '');
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const deliveryNumber = `SJ-${dateStr}-${randomSuffix}`;

    return await prisma.$transaction(async (tx: any) => {
        // 1. Create Sales Delivery record
        const delivery = await tx.salesDelivery.create({
            data: {
                deliveryNumber: deliveryNumber,
                recipient: data.recipient,
                buyerName: data.buyerName,
                warehouseId: data.warehouseId,
                salesPerson: data.salesPerson,
                createdAt: txDate,
                items: {
                    create: data.items.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        salesPrice: item.salesPrice as any,
                        uom: item.uom
                    }))
                }
            }
        });

        // 2. Update Stock (Subtract) and Record Movement for each item
        for (const item of data.items) {
            // Check if stock exists and is sufficient
            const currentStock = await tx.stock.findUnique({
                where: {
                    productId_warehouseId: {
                        productId: item.productId,
                        warehouseId: data.warehouseId
                    }
                }
            });

            if (!currentStock || currentStock.quantity < item.quantity) {
                const product = await tx.product.findUnique({ where: { id: item.productId } });
                throw new Error(`Stok tidak mencukupi untuk produk ${product?.name || item.productId}`);
            }

            await tx.stock.update({
                where: {
                    productId_warehouseId: {
                        productId: item.productId,
                        warehouseId: data.warehouseId
                    }
                },
                data: { quantity: { decrement: item.quantity } }
            });

            await tx.stockMovement.create({
                data: {
                    productId: item.productId,
                    warehouseId: data.warehouseId,
                    quantity: -item.quantity, // Negative for out
                    type: "SALE",
                    reference: deliveryNumber
                }
            });
        }

        // 3. Create Finance Journal Entries
        // Payment Journal is now handled by updatePaymentStatusAction when verified as Lunas (PAID)
        // Only Sales Revenue remains as an accrual-like entry (Debit AR/Other, Credit Sales) 
        // to show revenue on dashboard. But user wants Revenue separate.
        // Let's keep Revenue entry (Credit 401) but use a temporary clearing account for Debit
        // until it's PAID (to Bank 102).

        const totalSales = data.items.reduce((sum, item) => sum + (item.quantity * Number(item.salesPrice)), 0);

        if (totalSales > 0) {
            const tempAccount = await tx.financeAccount.findUnique({ where: { code: '105' } }); // Piutang/Clearing
            const salesAccount = await tx.financeAccount.findUnique({ where: { code: '401' } }); // Pendapatan

            if (tempAccount && salesAccount) {
                await tx.journalEntry.create({
                    data: {
                        description: `Piutang Penjualan: ${deliveryNumber} (${data.buyerName})`,
                        amount: totalSales as any,
                        type: "DEBIT",
                        accountId: tempAccount.id,
                        date: txDate
                    }
                });

                await tx.journalEntry.create({
                    data: {
                        description: `Pendapatan Penjualan: ${deliveryNumber} (${data.buyerName})`,
                        amount: totalSales as any,
                        type: "CREDIT",
                        accountId: salesAccount.id,
                        date: txDate
                    }
                });
            }
        }

        revalidatePath("/sales");
        revalidatePath("/warehouse");
        revalidatePath("/finance");
        revalidatePath("/");

        return { success: true, deliveryNumber };
    });
}

/**
 * ADMIN: Delete Sales Delivery
 */
export async function deleteSalesDeliveryAction(id: string) {
    return await prisma.$transaction(async (tx: any) => {
        const delivery = await tx.salesDelivery.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!delivery) throw new Error("Delivery not found");

        // 1. Reverse Stock (Add Back)
        for (const item of delivery.items) {
            await tx.stock.update({
                where: {
                    productId_warehouseId: {
                        productId: item.productId,
                        warehouseId: delivery.warehouseId
                    }
                },
                data: { quantity: { increment: item.quantity } }
            });

            await tx.stockMovement.create({
                data: {
                    productId: item.productId,
                    warehouseId: delivery.warehouseId,
                    quantity: item.quantity,
                    type: "SALE_CANCEL",
                    reference: delivery.deliveryNumber
                }
            });
        }

        // 2. Delete Journal Entries
        await tx.journalEntry.deleteMany({
            where: {
                description: {
                    contains: delivery.deliveryNumber
                }
            }
        });

        // 3. Delete the Delivery and Items
        await tx.salesDeliveryItem.deleteMany({ where: { deliveryId: id } });
        await tx.salesDelivery.delete({ where: { id } });

        revalidatePath("/sales");
        revalidatePath("/warehouse");
        revalidatePath("/finance");
        revalidatePath("/");

        return { success: true };
    });
}

/**
 * Finance Actions
 */
/**
 * FINANCE: Update Payment Status (Lunas / Belum Lunas)
 * This handles the actual cash flow to Bank BCA (102)
 */
export async function updatePaymentStatusAction(type: "PURCHASE" | "SALE", id: string, status: "PAID" | "PENDING") {
    return await prisma.$transaction(async (tx: any) => {
        let reference = "";
        let amount = 0;
        let party = "";

        if (type === "PURCHASE") {
            const receipt = await (tx.goodsReceipt as any).findUnique({
                where: { id },
                include: { items: true }
            });
            if (!receipt) throw new Error("Receipt not found");
            reference = receipt.receiptNumber;
            party = receipt.receivedFrom;
            amount = receipt.items.reduce((sum: number, i: any) => sum + (i.quantity * Number(i.purchasePrice)), 0);

            await (tx.goodsReceipt as any).update({
                where: { id },
                data: { paymentStatus: status }
            });

            // If changing to PAID, create Bank BCA Journal
            if (status === "PAID") {
                const bankAccount = await tx.financeAccount.findUnique({ where: { code: '102' } }); // Bank BCA
                const apAccount = await tx.financeAccount.findUnique({ where: { code: '201' } }); // Hutang

                if (bankAccount && apAccount) {
                    // Debit Hutang (Settling AP)
                    await tx.journalEntry.create({
                        data: {
                            description: `Pelunasan Hutang: ${reference} (${party})`,
                            amount: amount as any,
                            type: "DEBIT",
                            accountId: apAccount.id,
                            date: new Date()
                        }
                    });

                    // Credit Bank BCA (Actual Payment Out)
                    await tx.journalEntry.create({
                        data: {
                            description: `Pembelian Lunas (Bank): ${reference} (${party})`,
                            amount: amount as any,
                            type: "CREDIT",
                            accountId: bankAccount.id,
                            date: new Date()
                        }
                    });
                }
            }

        } else {
            const delivery = await (tx.salesDelivery as any).findUnique({
                where: { id },
                include: { items: true }
            });
            if (!delivery) throw new Error("Delivery not found");
            reference = delivery.deliveryNumber;
            party = delivery.buyerName;
            amount = delivery.items.reduce((sum: number, i: any) => sum + (i.quantity * Number(i.salesPrice || 0)), 0);

            await (tx.salesDelivery as any).update({
                where: { id },
                data: { paymentStatus: status }
            });

            if (status === "PAID") {
                const bankAccount = await tx.financeAccount.findUnique({ where: { code: '102' } }); // Bank BCA
                const arAccount = await tx.financeAccount.findUnique({ where: { code: '105' } });   // Piutang

                if (bankAccount && arAccount) {
                    // Debit Bank BCA (Actual Cash In)
                    await tx.journalEntry.create({
                        data: {
                            description: `Penerimaan Pelunasan Penjualan: ${reference} (${party})`,
                            amount: amount as any,
                            type: "DEBIT",
                            accountId: bankAccount.id,
                            date: new Date()
                        }
                    });

                    // Credit Piutang (Settling AR)
                    await tx.journalEntry.create({
                        data: {
                            description: `Penyelesaian Piutang: ${reference} (${party})`,
                            amount: amount as any,
                            type: "CREDIT",
                            accountId: arAccount.id,
                            date: new Date()
                        }
                    });
                }
            }
        }

        revalidatePath("/finance");
        revalidatePath("/");
        return { success: true };
    });
}

export async function createFinanceTransactionAction(data: {
    transactionType: "PAYMENT" | "RECEIPT";
    bank: string;
    date: Date;
    referenceNumber?: string;
    description: string;
    amount: number;
    accountId: string; // The category/target account (e.g., Expense or Income account)
    bankAccountId?: string; // Optional specific bank account from COA
}) {
    return await prisma.$transaction(async (tx: any) => {
        // 1. Create the Transaction record
        const transaction = await tx.financeTransaction.create({
            data: {
                transactionType: data.transactionType,
                bank: data.bank,
                date: data.date,
                referenceNumber: data.referenceNumber,
                description: data.description,
                amount: data.amount as any,
                // category: data.category
            }
        });

        // 2. Create Journal Entries (Double Entry)
        // For simplicity, we assume 'accountId' is the "Other" side of the bank transaction.
        // We'll also need a "Bank Account" in the COA. 
        // If bankAccountId is not provided, we might need a default Bank Asset account.

        const isPayment = data.transactionType === "PAYMENT";

        // Entry for target account
        await tx.journalEntry.create({
            data: {
                description: data.description,
                amount: data.amount as any,
                type: isPayment ? "DEBIT" : "CREDIT", // Payment usually Debits Expense, Receipt Credits Income
                accountId: data.accountId,
                transactionId: transaction.id,
                date: data.date
            }
        });

        // Entry for bank account (if provided or defaulted)
        if (data.bankAccountId) {
            await tx.journalEntry.create({
                data: {
                    description: `${data.transactionType}: ${data.bank} - ${data.referenceNumber || ''}`,
                    amount: data.amount as any,
                    type: isPayment ? "CREDIT" : "DEBIT", // Payment Credits Asset (Bank), Receipt Debits Asset (Bank)
                    accountId: data.bankAccountId,
                    transactionId: transaction.id,
                    date: data.date
                }
            });
        }

        revalidatePath("/finance");
        revalidatePath("/");

        return { success: true, transactionId: transaction.id };
    });
}

/**
 * ADMIN: Delete Finance Transaction
 */
export async function deleteFinanceTransactionAction(id: string) {
    return await prisma.$transaction(async (tx: any) => {
        // 1. Delete Journal Entries first
        await tx.journalEntry.deleteMany({
            where: { transactionId: id }
        });

        // 2. Delete the Transaction
        await tx.financeTransaction.delete({
            where: { id }
        });

        revalidatePath("/finance");
        revalidatePath("/");

        return { success: true };
    });
}

/**
 * ADMIN: Delete Journal Entry (Manual)
 */
export async function deleteJournalEntryAction(id: string) {
    await prisma.journalEntry.delete({
        where: { id }
    });

    revalidatePath("/finance");
    revalidatePath("/");

    return { success: true };
}

/**
 * Purchase Order Actions
 */
export async function createPurchaseOrderAction(data: {
    number: string;
    vendorId: string;
    items: { productId: string; quantity: number; price: number }[];
}) {
    const res = await (prisma as any).purchaseOrder.create({
        data: {
            number: data.number,
            vendorId: data.vendorId,
            items: {
                create: data.items.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price as any
                }))
            }
        }
    });

    revalidatePath("/purchase");
    return res;
}


export async function createJournalEntryAction(data: {
    description: string;
    amount: number;
    type: "DEBIT" | "CREDIT";
    accountId: string;
}) {
    await prisma.journalEntry.create({
        data: {
            description: data.description,
            amount: data.amount as any,
            type: data.type,
            accountId: data.accountId,
        }
    });

    revalidatePath("/finance");
    revalidatePath("/");
}

/**
 * Warehouse Stock Adjustment
 */
export async function updateStockAction(data: {
    productId: string;
    warehouseId: string;
    quantity: number;
    type: "ADJUSTMENT" | "SALE" | "GOODS_RECEIPT";
    reference?: string;
}) {
    await prisma.$transaction(async (tx: any) => {
        await tx.stock.upsert({
            where: {
                productId_warehouseId: {
                    productId: data.productId,
                    warehouseId: data.warehouseId
                }
            },
            update: { quantity: { increment: data.quantity } },
            create: {
                productId: data.productId,
                warehouseId: data.warehouseId,
                quantity: data.quantity
            }
        });

        await tx.stockMovement.create({
            data: {
                productId: data.productId,
                warehouseId: data.warehouseId,
                quantity: data.quantity,
                type: data.type,
                reference: data.reference
            }
        });
    });

    revalidatePath("/warehouse");
    revalidatePath("/");
}

/**
 * Admin: Database Management
 */
export async function wipeDatabaseAction() {
    return await prisma.$transaction(async (tx: any) => {
        // Delete transactional data but keep Master Data (Products, Warehouses, COA, Partners, Users)
        // Order matters due to foreign keys
        await tx.journalEntry.deleteMany();
        await tx.financeTransaction.deleteMany();
        await tx.goodsReceiptVerification.deleteMany();
        await tx.goodsReceiptItem.deleteMany();
        await tx.goodsReceipt.deleteMany();
        await tx.salesDeliveryItem.deleteMany();
        await tx.salesDelivery.deleteMany();
        await tx.purchaseOrderItem.deleteMany();
        await tx.purchaseOrder.deleteMany();
        await tx.stockMovement.deleteMany();
        await tx.stock.deleteMany();

        // Reset Partner Balances (Hutang/Piutang) to 0
        await tx.vendor.updateMany({ data: { balance: 0 } });
        await tx.customer.updateMany({ data: { balance: 0 } });

        revalidatePath("/");
        revalidatePath("/finance");
        revalidatePath("/purchase");
        revalidatePath("/sales");
        revalidatePath("/warehouse");

        return { success: true };
    });
}

export async function importProductsAction(products: {
    sku: string;
    name: string;
    category?: string;
    unit?: string;
    barcode?: string;
    purchasePrice?: number;
    salesPrice?: number;
    lowStockThreshold?: number;
}[]) {
    return await prisma.$transaction(async (tx: any) => {
        const results = [];
        for (const p of products) {
            const upserted = await tx.product.upsert({
                where: { sku: p.sku },
                update: {
                    name: p.name,
                    category: p.category,
                    unit: p.unit,
                    barcode: p.barcode,
                    purchasePrice: p.purchasePrice as any,
                    salesPrice: p.salesPrice as any,
                    lowStockThreshold: p.lowStockThreshold
                },
                create: {
                    sku: p.sku,
                    name: p.name,
                    category: p.category,
                    unit: p.unit,
                    barcode: p.barcode,
                    purchasePrice: p.purchasePrice as any,
                    salesPrice: p.salesPrice as any,
                    lowStockThreshold: p.lowStockThreshold || 10
                }
            });
            results.push(upserted);
        }

        revalidatePath("/warehouse");
        revalidatePath("/");

        return { success: true, count: results.length };
    });
}

/**
 * Settings & System Actions
 */
/**
 * ADMIN: Delete Product
 */
export async function deleteProductAction(id: string) {
    // Check if product is in use (to avoid DB errors or orphan records)
    const inUse = await prisma.product.findUnique({
        where: { id },
        include: {
            _count: {
                select: {
                    receiptItems: true,
                    salesItems: true
                }
            }
        }
    });

    if (inUse?._count.receiptItems || inUse?._count.salesItems) {
        throw new Error("Produk tidak bisa dihapus karena sudah memiliki riwayat transaksi.");
    }

    await prisma.$transaction([
        prisma.stock.deleteMany({ where: { productId: id } }),
        prisma.stockMovement.deleteMany({ where: { productId: id } }),
        prisma.product.delete({ where: { id } })
    ]);

    revalidatePath("/warehouse");
    revalidatePath("/purchase");
    revalidatePath("/sales");
    revalidatePath("/");

    return { success: true };
}

export async function getSystemSettingsAction() {
    let settings;
    try {
        settings = await (prisma as any).systemSetting.findUnique({
            where: { id: "global" }
        });
    } catch (e) {
        // Fallback for when prisma client is not generated with the new model
        const results = await prisma.$queryRaw<any[]>`SELECT * FROM SystemSetting WHERE id = 'global' LIMIT 1`;
        if (results && results.length > 0) {
            settings = {
                id: results[0].id,
                companyName: results[0].companyName,
                address: results[0].address,
                taxId: results[0].taxId,
                website: results[0].website
            };
        }
    }

    const [productCount, vendorCount, customerCount, warehouseCount] = await Promise.all([
        prisma.product.count(),
        prisma.vendor.count(),
        prisma.customer.count(),
        prisma.warehouse.count(),
    ]);

    return {
        settings: settings || {
            companyName: "PT. Kola Borasi Indonesia",
            address: "Jl. Industri No. 12, Jakarta Pusat, DKI Jakarta",
            taxId: "01.234.567.8-012.000",
            website: "www.kolaborasi.id"
        },
        counts: {
            product: productCount,
            vendor: vendorCount,
            customer: customerCount,
            warehouse: warehouseCount
        }
    };
}

export async function updateSystemSettingsAction(data: {
    companyName: string;
    address: string;
    taxId: string;
    website: string;
}) {
    try {
        await (prisma as any).systemSetting.upsert({
            where: { id: "global" },
            update: data,
            create: {
                id: "global",
                ...data
            }
        });
    } catch (e) {
        // Raw SQL fallback for SQLite
        await prisma.$executeRaw`
            INSERT INTO SystemSetting (id, companyName, address, taxId, website, updatedAt)
            VALUES ('global', ${data.companyName}, ${data.address}, ${data.taxId}, ${data.website}, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                companyName = excluded.companyName,
                address = excluded.address,
                taxId = excluded.taxId,
                website = excluded.website,
                updatedAt = CURRENT_TIMESTAMP
        `;
    }

    revalidatePath("/settings");
    revalidatePath("/");

    return { success: true };
}

/**
 * ADMIN: Finance Opening Balance (Saldo Awal)
 */
export async function setOpeningBalanceAction(data: { accountId: string; amount: number; date?: Date }) {
    return await prisma.$transaction(async (tx: any) => {
        const account = await tx.financeAccount.findUnique({ where: { id: data.accountId } });
        if (!account) throw new Error("Akun tidak ditemukan.");

        // Create a special opening balance record
        await tx.journalEntry.create({
            data: {
                description: `Saldo Awal: ${account.name}`,
                amount: data.amount as any,
                type: account.type === "ASSET" ? "DEBIT" : "CREDIT",
                accountId: data.accountId,
                date: data.date || new Date(new Date().getFullYear(), 0, 1), // Default to start of year
            }
        });

        revalidatePath("/finance");
        revalidatePath("/");

        return { success: true };
    });
}

/**
 * ADMIN: Master Data Actions
 */
export async function createVendorAction(data: { name: string; email?: string; phone?: string; address?: string }) {
    await prisma.vendor.create({ data });
    revalidatePath("/settings");
    revalidatePath("/purchase");
    return { success: true };
}

export async function deleteVendorAction(id: string) {
    await prisma.vendor.delete({ where: { id } });
    revalidatePath("/settings");
    revalidatePath("/purchase");
    return { success: true };
}

export async function createCustomerAction(data: { name: string; email?: string; phone?: string; address?: string }) {
    await prisma.customer.create({ data });
    revalidatePath("/settings");
    revalidatePath("/sales");
    return { success: true };
}

export async function deleteCustomerAction(id: string) {
    await prisma.customer.delete({ where: { id } });
    revalidatePath("/settings");
    revalidatePath("/sales");
    return { success: true };
}

export async function createWarehouseAction(data: { name: string; location: string }) {
    await prisma.warehouse.create({ data });
    revalidatePath("/settings");
    revalidatePath("/warehouse");
    return { success: true };
}

export async function deleteWarehouseAction(id: string) {
    const stocks = await prisma.stock.count({ where: { warehouseId: id } });
    if (stocks > 0) throw new Error("Gudang tidak bisa dihapus karena masih ada stok.");

    await prisma.warehouse.delete({ where: { id } });
    revalidatePath("/settings");
    revalidatePath("/warehouse");
    return { success: true };
}

/**
 * DASHBOARD & ANALYTICS: Summary Stats
 */
export async function getDashboardSummaryAction() {
    // 1. Total Revenue (Sum of Sales Delivery values)
    const salesItems = await prisma.salesDeliveryItem.findMany();
    const totalRevenue = salesItems.reduce((sum, item) => sum + (item.quantity * Number(item.salesPrice)), 0);

    // 2. Asset Value (Inventory Value: Qty * Average Purchase Price or latest)
    const stockItems = await prisma.stock.findMany({
        include: {
            product: {
                include: {
                    receiptItems: {
                        orderBy: { receipt: { date: 'desc' } },
                        take: 1
                    }
                }
            }
        }
    });

    let assetValue = 0;
    let totalStockQty = 0;
    stockItems.forEach(s => {
        const latestPrice = Number(s.product.receiptItems[0]?.purchasePrice || 0);
        assetValue += s.quantity * latestPrice;
        totalStockQty += s.quantity;
    });

    // 3. Purchase Volume (Sum of Verified Goods Receipt quantity)
    const rawVerified: any[] = await prisma.$queryRaw`SELECT id FROM GoodsReceipt WHERE isVerified = 1`;
    const verifiedIds = rawVerified.map(r => r.id);

    let purchaseVol = 0;
    if (verifiedIds.length > 0) {
        const verifiedItems = await prisma.goodsReceiptItem.findMany({
            where: { receiptId: { in: verifiedIds } }
        });
        verifiedItems.forEach(i => purchaseVol += i.quantity);
    }

    // 4. Finance Cash & Bank Balance (Sum of Cash/Bank accounts: codes starting with 101 or 102)
    const bankEntries = await prisma.journalEntry.findMany({
        where: {
            account: {
                OR: [
                    { code: { startsWith: '101' } },
                    { code: { startsWith: '102' } }
                ]
            }
        }
    });
    let cashBalance = 0;
    bankEntries.forEach(e => {
        if (e.type === "DEBIT") cashBalance += Number(e.amount);
        else cashBalance -= Number(e.amount);
    });

    // 5. Total Hutang (Account 201) & Total Piutang (Account 105)
    const detailEntries = await prisma.journalEntry.findMany({
        where: { account: { code: { in: ['201', '105'] } } },
        include: { account: true }
    });

    let totalHutang = 0;
    let totalPiutang = 0;

    detailEntries.forEach(e => {
        const amt = Number(e.amount);
        if (e.account.code === '201') {
            if (e.type === "CREDIT") totalHutang += amt;
            else totalHutang -= amt;
        } else if (e.account.code === '105') {
            if (e.type === "DEBIT") totalPiutang += amt;
            else totalPiutang -= amt;
        }
    });

    return {
        totalRevenue: totalRevenue || 0,
        assetValue: assetValue || 0,
        purchaseVol: purchaseVol || 0,
        totalStockQty: totalStockQty || 0,
        cashBalance: cashBalance || 0,
        totalHutang: totalHutang || 0,
        totalPiutang: totalPiutang || 0,
        productCount: stockItems.length
    };
}

/**
 * WAREHOUSE CHECKER: Fetch Pending Verifications
 */
export async function getUnverifiedReceiptsAction() {
    const rawUnverified: any[] = await prisma.$queryRaw`SELECT id FROM GoodsReceipt WHERE isVerified = 0 ORDER BY createdAt DESC`;
    const ids = rawUnverified.map(r => r.id);

    if (ids.length === 0) return [];

    return await prisma.goodsReceipt.findMany({
        where: { id: { in: ids } },
        include: {
            items: { include: { product: true } },
            warehouse: true
        }
    });
}

/**
 * SETTINGS: Fetch All Master Data for management
 */
export async function getMDAction() {
    const [vendors, customers, warehouses, coa] = await Promise.all([
        prisma.vendor.findMany({ orderBy: { name: 'asc' } }),
        prisma.customer.findMany({ orderBy: { name: 'asc' } }),
        prisma.warehouse.findMany({ orderBy: { name: 'asc' } }),
        prisma.financeAccount.findMany({ orderBy: { code: 'asc' } }),
    ]);

    // Serialize balances for client components
    const serializedVendors = (vendors || []).map(v => ({
        ...v,
        balance: Number(v.balance)
    }));

    const serializedCustomers = (customers || []).map(c => ({
        ...c,
        balance: Number(c.balance)
    }));

    return {
        vendors: serializedVendors,
        customers: serializedCustomers,
        warehouses: warehouses || [],
        coa: coa || []
    };
}

/**
 * WAREHOUSE CHECKER: Submit physical verification results
 */
export async function submitGoodsReceiptVerificationAction(data: {
    receiptId: string;
    verifiedBy: string;
    items: {
        productId: string;
        expectedQuantity: number;
        actualQuantity: number;
        expectedPrice: number;
        actualPrice: number;
        notes?: string;
    }[];
}) {
    return await prisma.$transaction(async (tx: any) => {
        // Create verification records
        for (const item of data.items) {
            await tx.goodsReceiptVerification.create({
                data: {
                    receiptId: data.receiptId,
                    productId: item.productId,
                    expectedQuantity: item.expectedQuantity,
                    actualQuantity: item.actualQuantity,
                    expectedPrice: item.expectedPrice as any,
                    actualPrice: item.actualPrice as any,
                    notes: item.notes,
                    verifiedBy: data.verifiedBy
                }
            });
        }

        const allMatch = data.items.every(
            (item: any) => item.expectedQuantity === item.actualQuantity &&
                Number(item.expectedPrice) === Number(item.actualPrice)
        );

        if (allMatch) {
            await tx.goodsReceipt.update({
                where: { id: data.receiptId },
                data: {
                    isVerified: true,
                    verifiedAt: new Date(),
                    verifiedBy: data.verifiedBy
                }
            });

            const receipt = await tx.goodsReceipt.findUnique({
                where: { id: data.receiptId },
                include: { items: true }
            });

            if (receipt) {
                for (const item of receipt.items) {
                    await tx.stock.upsert({
                        where: {
                            productId_warehouseId: {
                                productId: item.productId,
                                warehouseId: receipt.warehouseId
                            }
                        },
                        update: { quantity: { increment: item.quantity } },
                        create: {
                            productId: item.productId,
                            warehouseId: receipt.warehouseId,
                            quantity: item.quantity
                        }
                    });

                    await tx.stockMovement.create({
                        data: {
                            productId: item.productId,
                            warehouseId: receipt.warehouseId,
                            quantity: item.quantity,
                            type: "GOODS_RECEIPT",
                            reference: receipt.receiptNumber
                        }
                    });
                }
            }
        }

        revalidatePath("/warehouse");
        revalidatePath("/purchase");

        return { success: true, allMatch };
    });
}

/**
 * WAREHOUSE CHECKER: Get all receipts for verification list
 */
export async function getGoodsReceiptsAction() {
    return await prisma.goodsReceipt.findMany({
        include: {
            items: {
                include: {
                    product: true
                }
            },
            warehouse: true
        },
        orderBy: { createdAt: 'desc' }
    });
}

/**
 * UPDATE: Sales Delivery (Edit existing)
 * Note: This reverses previous stock/journals and applies new ones
 */
export async function updateSalesDeliveryAction(id: string, data: {
    recipient: string;
    buyerName: string;
    warehouseId: string;
    salesPerson?: string;
    items: { productId: string; quantity: number; salesPrice: number; uom?: string }[];
}) {
    return await prisma.$transaction(async (tx: any) => {
        const existing = await tx.salesDelivery.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!existing) throw new Error("Pengiriman tidak ditemukan");

        // 1. REVERSE PREVIOUS STOCK (Add back)
        for (const item of existing.items) {
            await tx.stock.update({
                where: {
                    productId_warehouseId: {
                        productId: item.productId,
                        warehouseId: existing.warehouseId
                    }
                },
                data: { quantity: { increment: item.quantity } }
            });

            await tx.stockMovement.create({
                data: {
                    productId: item.productId,
                    warehouseId: existing.warehouseId,
                    quantity: item.quantity,
                    type: "SALE_CANCEL",
                    reference: existing.deliveryNumber
                }
            });
        }

        // 2. REVERSE PREVIOUS JOURNALS
        await tx.journalEntry.deleteMany({
            where: {
                description: { contains: existing.deliveryNumber }
            }
        });

        // 3. UPDATE HEADER
        const updated = await tx.salesDelivery.update({
            where: { id },
            data: {
                recipient: data.recipient,
                buyerName: data.buyerName,
                warehouseId: data.warehouseId,
                salesPerson: data.salesPerson
            }
        });

        // 4. UPDATE ITEMS
        await tx.salesDeliveryItem.deleteMany({ where: { deliveryId: id } });
        await tx.salesDeliveryItem.createMany({
            data: data.items.map(item => ({
                deliveryId: id,
                productId: item.productId,
                quantity: item.quantity,
                salesPrice: item.salesPrice as any,
                uom: item.uom
            }))
        });

        // 5. APPLY NEW STOCK (Subtract)
        for (const item of data.items) {
            await tx.stock.update({
                where: {
                    productId_warehouseId: {
                        productId: item.productId,
                        warehouseId: data.warehouseId
                    }
                },
                data: { quantity: { decrement: item.quantity } }
            });

            await tx.stockMovement.create({
                data: {
                    productId: item.productId,
                    warehouseId: data.warehouseId,
                    quantity: -item.quantity,
                    type: "SALE",
                    reference: existing.deliveryNumber
                }
            });
        }

        // 6. APPLY NEW JOURNALS
        const totalSales = data.items.reduce((sum, item) => sum + (item.quantity * item.salesPrice), 0);
        if (totalSales > 0) {
            const bankAccount = await tx.financeAccount.findUnique({ where: { code: '102' } });
            const salesAccount = await tx.financeAccount.findUnique({ where: { code: '401' } });

            if (bankAccount && salesAccount) {
                await tx.journalEntry.create({
                    data: {
                        description: `Penerimaan Penjualan (Updated): ${existing.deliveryNumber} (${data.buyerName})`,
                        amount: totalSales as any,
                        type: "DEBIT",
                        accountId: bankAccount.id,
                        date: new Date()
                    }
                });

                await tx.journalEntry.create({
                    data: {
                        description: `Pendapatan Penjualan (Updated): ${existing.deliveryNumber} (${data.buyerName})`,
                        amount: totalSales as any,
                        type: "CREDIT",
                        accountId: salesAccount.id,
                        date: new Date()
                    }
                });
            }
        }

        revalidatePath("/sales");
        revalidatePath("/finance");
        revalidatePath("/warehouse");
        revalidatePath("/");

        return { success: true };
    });
}
