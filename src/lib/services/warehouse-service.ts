
import { revalidatePath } from "next/cache";

/**
 * WAREHOUSE SERVICES
 * Strictly server-side logic for warehouse operations.
 */

export async function adjustStockService(data: any) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    return await prisma.$transaction(async (tx: any) => {
        const { productId, warehouseId, vendorName, type, amount, adjustedBy } = data;
        const currentStock = await tx.stock.findUnique({
            where: {
                productId_warehouseId_vendorName: {
                    productId,
                    warehouseId,
                    vendorName
                }
            }
        });

        const currentQty = currentStock ? currentStock.quantity : 0;
        let diff = 0;

        if (type === "ADD") {
            diff = amount;
        } else if (type === "SUBTRACT") {
            diff = -amount;
            if (currentQty + diff < 0) {
                throw new Error(`Stok tidak cukup. Stok saat ini: ${currentQty}`);
            }
        } else if (type === "SET") {
            if (amount < 0) throw new Error("Stok akhir tidak boleh negatif");
            diff = amount - currentQty;
        }

        if (diff === 0) return { success: true, message: "Tidak ada perubahan stok." };

        await tx.stock.upsert({
            where: {
                productId_warehouseId_vendorName: {
                    productId,
                    warehouseId,
                    vendorName
                }
            },
            update: { quantity: { increment: diff } },
            create: {
                productId,
                warehouseId,
                vendorName,
                quantity: diff
            }
        });

        await tx.stockMovement.create({
            data: {
                productId,
                warehouseId,
                vendorName,
                quantity: diff,
                type: "ADJUSTMENT",
                reference: `MANUAL-${adjustedBy.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`
            }
        });

        revalidatePath("/warehouse");
        revalidatePath("/");
        return { success: true };
    }, { timeout: 30000 });
}

export async function getProductTrackingService(productId: string, userId: string, prefix: string, isAdmin: boolean) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    const salesFilter = isAdmin ? {} : { 
        OR: [
            { salesPerson: prefix },
            { salesPerson: null }
        ]
    };
    const purchaseFilter = isAdmin ? {} : { 
        OR: [
            { createdById: userId },
            { createdBy: { role: "ADMIN" } }
        ],
        NOT: { salesPerson: "PF" }
    };

    const [receipts, deliveries, pReturns, sReturns, product] = await Promise.all([
        prisma.goodsReceiptItem.findMany({
            where: { productId, receipt: purchaseFilter },
            include: { receipt: true }
        }),
        prisma.salesDeliveryItem.findMany({
            where: { productId, delivery: salesFilter },
            include: { delivery: true }
        }),
        prisma.purchaseReturnItem.findMany({
            where: { productId, purchaseReturn: { receipt: purchaseFilter } },
            include: { purchaseReturn: { include: { receipt: true } } }
        }),
        prisma.salesReturnItem.findMany({
            where: { productId, salesReturn: { delivery: salesFilter } },
            include: { salesReturn: { include: { delivery: true } } }
        }),
        prisma.product.findUnique({
            where: { id: productId },
            select: { name: true, sku: true, uom: true }
        })
    ]);

    if (!product) throw new Error("Produk tidak ditemukan");

    const history: any[] = [];
    receipts.forEach((item: any) => {
        history.push({
            id: item.id,
            parentId: item.receipt.id,
            date: item.receipt.date || item.receipt.createdAt,
            type: "PURCHASE",
            ref: item.receipt.receiptNumber,
            partner: item.receipt.receivedFrom,
            qtyIn: item.quantity,
            qtyOut: 0
        });
    });

    deliveries.forEach((item: any) => {
        history.push({
            id: item.id,
            parentId: item.delivery.id,
            date: item.delivery.date || item.delivery.createdAt,
            type: "SALE",
            ref: item.delivery.deliveryNumber,
            partner: item.delivery.buyerName || item.delivery.recipient || "Unknown Customer",
            qtyIn: 0,
            qtyOut: item.quantity
        });
    });

    pReturns.forEach((item: any) => {
        history.push({
            id: item.id,
            parentId: item.purchaseReturn.id,
            date: item.purchaseReturn.date || item.purchaseReturn.createdAt,
            type: "PURCHASE_RETURN",
            ref: item.purchaseReturn.returnNumber,
            partner: item.purchaseReturn.receipt.receivedFrom,
            qtyIn: 0,
            qtyOut: item.quantity
        });
    });

    sReturns.forEach((item: any) => {
        history.push({
            id: item.id,
            parentId: item.salesReturn.id,
            date: item.salesReturn.date || item.salesReturn.createdAt,
            type: "SALES_RETURN",
            ref: item.salesReturn.returnNumber,
            partner: item.salesReturn.delivery.buyerName || "Customer",
            qtyIn: item.quantity,
            qtyOut: 0
        });
    });

    history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const { serializeDecimal } = require("@/lib/utils");
    return serializeDecimal({ product, history });
}
export async function verifyGoodsReceiptService(receiptId: string, verifiedBy: string, checkedItems: Record<string, number>) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    return await prisma.$transaction(async (tx: any) => {
        const receipt = await tx.goodsReceipt.findUnique({
            where: { id: receiptId },
            include: { items: { include: { product: true } } }
        });

        if (!receipt) throw new Error("Penerimaan tidak ditemukan.");
        if (receipt.isVerified) throw new Error("Penerimaan sudah diverifikasi sebelumnya.");

        // 1. Mark as verified
        await tx.goodsReceipt.update({
            where: { id: receiptId },
            data: {
                isVerified: true,
                verifiedBy,
                verifiedAt: new Date()
            }
        });

        // 2. Create Audit Records (Verification) for each item
        for (const item of receipt.items) {
            // Use checked quantity from checker, fallback to 0 if not scanned
            const actualQty = Number(checkedItems[item.id] ?? 0);
            const expectedQty = item.quantity;
            
            // Record the audit result in GoodsReceiptVerification table
            await tx.goodsReceiptVerification.create({
                data: {
                    receiptId: receiptId,
                    productId: item.productId,
                    expectedQuantity: expectedQty,
                    actualQuantity: actualQty,
                    expectedPrice: item.purchasePrice,
                    actualPrice: item.purchasePrice, // Currently we assume price matches
                    verifiedBy: verifiedBy,
                    notes: actualQty === expectedQty ? "Match" : `Discrepancy: Found ${actualQty} of ${expectedQty}`
                }
            });
        }
        
        revalidatePath("/warehouse");
        revalidatePath("/purchase");
        revalidatePath("/tracking");
        revalidatePath("/");
        return { success: true };
    }, { timeout: 30000 });
}

export async function bulkVerifyGoodsReceiptsService(verifiedBy: string) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    return await prisma.$transaction(async (tx: any) => {
        const pending = await tx.goodsReceipt.findMany({
            where: { isVerified: false, isVoid: false },
            include: { items: true }
        });

        if (pending.length === 0) return { success: true, count: 0 };

        for (const receipt of pending) {
            await tx.goodsReceipt.update({
                where: { id: receipt.id },
                data: {
                    isVerified: true,
                    verifiedBy,
                    verifiedAt: new Date()
                }
            });

            for (const item of receipt.items) {
                await tx.goodsReceiptVerification.create({
                    data: {
                        receiptId: receipt.id,
                        productId: item.productId,
                        expectedQuantity: item.quantity,
                        actualQuantity: item.quantity,
                        expectedPrice: item.purchasePrice,
                        actualPrice: item.purchasePrice,
                        verifiedBy,
                        notes: "Bulk Verified: Match 100%"
                    }
                });
            }
        }

        revalidatePath("/warehouse");
        revalidatePath("/purchase");
        revalidatePath("/tracking");
        revalidatePath("/");
        
        return { success: true, count: pending.length };
    }, { timeout: 120000 });
}

export async function voidGoodsReceiptService(id: string, reason: string) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    return await prisma.$transaction(async (tx: any) => {
        const receipt = await tx.goodsReceipt.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!receipt) throw new Error("Penerimaan tidak ditemukan.");
        if (receipt.isVoid) throw new Error("Penerimaan sudah dibatalkan.");

        if (receipt.isVerified) {
            // Revert Stock
            for (const item of receipt.items) {
                const vendorName = receipt.receivedFrom || "UMUM";
                
                await tx.stock.upsert({
                    where: {
                        productId_warehouseId_vendorName: {
                            productId: item.productId,
                            warehouseId: receipt.warehouseId,
                            vendorName: vendorName
                        }
                    },
                    update: { quantity: { decrement: item.quantity } },
                    create: {
                        productId: item.productId,
                        warehouseId: receipt.warehouseId,
                        vendorName: vendorName,
                        quantity: -item.quantity
                    }
                });

                // Create Reversing Movement
                await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        warehouseId: receipt.warehouseId,
                        vendorName: vendorName,
                        quantity: -item.quantity,
                        type: "PURCHASE_VOID",
                        reference: receipt.receiptNumber
                    }
                });
            }
        }

        // Void associated ProductLots
        await tx.productLot.updateMany({
            where: { grNumber: receipt.receiptNumber },
            data: { isVoided: true, remainingQty: 0 }
        });

        // Delete associated journal entries
        await tx.journalEntry.deleteMany({
            where: { description: { contains: receipt.receiptNumber } }
        });

        // Mark as Voided
        await tx.goodsReceipt.update({
            where: { id },
            data: {
                isVoid: true,
                voidReason: reason
            }
        });

        revalidatePath("/warehouse");
        revalidatePath("/purchase");
        revalidatePath("/tracking");
        revalidatePath("/");
        return { success: true };
    }, { timeout: 30000 });
}

export async function runStockAuditService() {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    // 1. Get all products with their current stock table values (shallow fetch)
    const products = await prisma.product.findMany({
        select: {
            id: true,
            sku: true,
            name: true,
            purchasePrice: true,
            stocks: { select: { quantity: true } }
        }
    });

    // 2. Aggregate counts from history using database groupBy (Massively faster)
    const [
        purchasedAgg, 
        soldAgg, 
        purchRetAgg, 
        salesRetAgg, 
        adjAgg
    ] = await Promise.all([
        prisma.goodsReceiptItem.groupBy({
            by: ['productId'],
            where: { receipt: { isVerified: true, isVoid: false } },
            _sum: { quantity: true }
        }),
        prisma.salesDeliveryItem.groupBy({
            by: ['productId'],
            where: { delivery: { isVoid: false } },
            _sum: { quantity: true }
        }),
        prisma.purchaseReturnItem.groupBy({
            by: ['productId'],
            where: { purchaseReturn: { isVoid: false } },
            _sum: { quantity: true }
        }),
        prisma.salesReturnItem.groupBy({
            by: ['productId'],
            where: { salesReturn: { isVoid: false } },
            _sum: { quantity: true }
        }),
        prisma.stockMovement.groupBy({
            by: ['productId'],
            where: { type: "ADJUSTMENT" },
            _sum: { quantity: true }
        })
    ]);

    // 3. Convert aggregations to Maps for O(1) lookup
    const purchasedMap = new Map(purchasedAgg.map((i: any) => [i.productId, i._sum.quantity || 0]));
    const soldMap = new Map(soldAgg.map((i: any) => [i.productId, i._sum.quantity || 0]));
    const purchRetMap = new Map(purchRetAgg.map((i: any) => [i.productId, i._sum.quantity || 0]));
    const salesRetMap = new Map(salesRetAgg.map((i: any) => [i.productId, i._sum.quantity || 0]));
    const adjMap = new Map(adjAgg.map((i: any) => [i.productId, i._sum.quantity || 0]));

    // 4. Compute Results
    const results = products.map((p: any) => {
        const currentStock = p.stocks.reduce((acc: number, s: any) => acc + (Number(s.quantity) || 0), 0);
        
        const totalPurchased = Number(purchasedMap.get(p.id) || 0);
        const totalSold = Number(soldMap.get(p.id) || 0);
        const totalPurchReturned = Number(purchRetMap.get(p.id) || 0);
        const totalSalesReturned = Number(salesRetMap.get(p.id) || 0);
        const totalAdjustments = Number(adjMap.get(p.id) || 0);

        const calculatedStock = totalPurchased - totalSold - totalPurchReturned + totalSalesReturned + totalAdjustments;
        const discrepancy = currentStock - calculatedStock;
        
        // Financials
        const buyPrice = Number(p.purchasePrice || 0);
        const discrepancyValue = discrepancy * buyPrice;

        return {
            id: p.id,
            sku: p.sku,
            name: p.name,
            currentStock,
            calculatedStock,
            discrepancy,
            discrepancyValue,
            purchasePrice: buyPrice,
            totalPurchased,
            totalSold,
            totalPurchReturned,
            totalSalesReturned,
            totalAdjustments
        };
    });

    const { serializeDecimal } = require("@/lib/utils");
    return serializeDecimal(results);
}

export async function syncProductStockService(productId: string, syncBy: string) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    return await prisma.$transaction(async (tx: any) => {
        // 1. Calculate History
        const p = await tx.product.findUnique({
            where: { id: productId },
            include: {
                stocks: true,
                receiptItems: { where: { receipt: { isVerified: true, isVoid: false } }, select: { quantity: true } },
                salesItems: { where: { delivery: { isVoid: false } }, select: { quantity: true } },
                purchaseReturnItems: { where: { purchaseReturn: { isVoid: false } }, select: { quantity: true } },
                salesReturnItems: { where: { salesReturn: { isVoid: false } }, select: { quantity: true } },
                movements: { where: { type: "ADJUSTMENT" }, select: { quantity: true } }
            }
        });

        if (!p) throw new Error("Produk tidak ditemukan");

        const currentStockTotal = p.stocks.reduce((acc: number, s: any) => acc + (Number(s.quantity) || 0), 0);
        const totalPurchased = p.receiptItems.reduce((acc: number, r: any) => acc + (Number(r.quantity) || 0), 0);
        const totalSold = p.salesItems.reduce((acc: number, s: any) => acc + (Number(s.quantity) || 0), 0);
        const totalPurchReturned = p.purchaseReturnItems.reduce((acc: number, pr: any) => acc + (Number(pr.quantity) || 0), 0);
        const totalSalesReturned = p.salesReturnItems.reduce((acc: number, sr: any) => acc + (Number(sr.quantity) || 0), 0);
        const totalAdjustments = p.movements.reduce((acc: number, m: any) => acc + (Number(m.quantity) || 0), 0);

        const calculatedStock = totalPurchased - totalSold - totalPurchReturned + totalSalesReturned + totalAdjustments;
        const discrepancy = calculatedStock - currentStockTotal;

        if (discrepancy === 0) return { success: true, message: "Stok sudah sinkron." };

        // 2. We apply the correction to the 'UMUM' vendor stock in the primary warehouse (or first found)
        const primaryStock = p.stocks[0] || await tx.stock.findFirst({ where: { productId } });
        
        if (!primaryStock) {
            // If no stock record exists at all, we create one in a default warehouse
            const warehouse = await tx.warehouse.findFirst();
            if (!warehouse) throw new Error("Tidak ada gudang terdefinisi untuk sinkronisasi");
            
            await tx.stock.create({
                data: {
                    productId,
                    warehouseId: warehouse.id,
                    vendorName: "UMUM",
                    quantity: calculatedStock
                }
            });

            await tx.stockMovement.create({
                data: {
                    productId,
                    warehouseId: warehouse.id,
                    vendorName: "UMUM",
                    quantity: calculatedStock,
                    type: "ADJUSTMENT",
                    reference: `SYNC-INITIAL-${syncBy.substring(0, 3).toUpperCase()}`
                }
            });
        } else {
            // Apply compensator movement
            await tx.stock.update({
                where: { id: primaryStock.id },
                data: { quantity: { increment: discrepancy } }
            });

            await tx.stockMovement.create({
                data: {
                    productId,
                    warehouseId: primaryStock.warehouseId,
                    vendorName: primaryStock.vendorName,
                    quantity: discrepancy,
                    type: "ADJUSTMENT",
                    reference: `SYNC-AUDIT-${syncBy.substring(0, 3).toUpperCase()}`
                }
            });
        }

    revalidatePath("/warehouse");
    revalidatePath("/tracking");
    revalidatePath("/");
    
    return { success: true, discrepancy };
    }, { timeout: 30000 });
}

export async function getStockCardService(productId: string, startDate?: string, endDate?: string, warehouseId?: string) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    // 1. Get Product Info
    const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { sku: true, name: true, uom: true }
    });
    if (!product) throw new Error("Produk tidak ditemukan");

    // 2. Define Filters
    const whereMovements: any = { productId };
    if (warehouseId) whereMovements.warehouseId = warehouseId;
    
    // Set start to beginning of day and end to end of day if strings provided
    const start = startDate ? new Date(new Date(startDate).setHours(0,0,0,0)) : new Date(0);
    const end = endDate ? new Date(new Date(endDate).setHours(23,59,59,999)) : new Date();

    // 3. Calculate Opening Balance (Saldo Awal)
    const openingAgg = await prisma.stockMovement.aggregate({
        where: {
            ...whereMovements,
            createdAt: { lt: start }
        },
        _sum: { quantity: true }
    });
    const openingBalance = Number(openingAgg._sum.quantity || 0);

    // 4. Fetch Movements within range
    const movements = await prisma.stockMovement.findMany({
        where: {
            ...whereMovements,
            createdAt: { gte: start, lte: end }
        },
        orderBy: { createdAt: 'asc' },
        include: { warehouse: { select: { name: true } } }
    });

    // 5. Calculate Running Balance
    let currentBalance = openingBalance;
    const history = movements.map((m: any) => {
        const qty = Number(m.quantity);
        currentBalance += qty;
        
        // Map type to human readable label
        let label = m.type;
        if (m.type === "GOODS_RECEIPT") label = "PEMBELIAN";
        if (m.type === "SALE") label = "PENJUALAN";
        if (m.type === "ADJUSTMENT") label = "ADJUSTMENT";
        if (m.type === "PURCHASE_VOID") label = "VOID BELI";
        if (m.type === "SALE_VOID") label = "VOID JUAL";
        if (m.type === "SALE_DELETE") label = "HAPUS JUAL";

        return {
            date: m.createdAt,
            ref: m.reference || "-",
            type: label,
            qtyIn: qty > 0 ? qty : 0,
            qtyOut: qty < 0 ? Math.abs(qty) : 0,
            balance: currentBalance,
            warehouse: m.warehouse?.name || "Unknown",
            vendor: m.vendorName || "UMUM"
        };
    });

    const { serializeDecimal } = require("@/lib/utils");
    return serializeDecimal({
        product,
        warehouseName: warehouseId ? movements[0]?.warehouse?.name : "SEMUA GUDANG",
        openingBalance,
        history,
        totalIn: history.reduce((acc: number, curr: any) => acc + curr.qtyIn, 0),
        totalOut: history.reduce((acc: number, curr: any) => acc + curr.qtyOut, 0),
        finalBalance: currentBalance
    });
}
