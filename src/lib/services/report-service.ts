
import { getPrisma } from "@/lib/prisma";

/**
 * OPTIMIZED FIFO TRACEABILITY (BUY/SELL PAIRING)
 * Performance: Only loads data for products sold in the target month.
 * Uses pre-computed Maps for O(1) return lookups.
 */
export async function getProductTraceabilityService(month?: number, year?: number) {
    const prisma = getPrisma();
    
    const filterYear = year || new Date().getFullYear();
    const filterMonth = month || (new Date().getMonth() + 1);
    const startDate = new Date(filterYear, filterMonth - 1, 1);
    const endDate = new Date(filterYear, filterMonth, 0, 23, 59, 59);

    try {
        // STEP 1: Find which products were SOLD in the target month (lightweight query)
        const soldItems = await prisma.salesDeliveryItem.findMany({
            where: { 
                delivery: { isVoid: false, date: { gte: startDate, lte: endDate } }
            },
            select: { productId: true },
            distinct: ['productId']
        });
        
        const targetProductIds = soldItems.map(i => i.productId);
        
        if (targetProductIds.length === 0) return [];

        // STEP 2: Fetch data ONLY for those products
        const [allLPBItems, allSJItems, allPurchaseReturns, allSalesReturns] = await Promise.all([
            // Purchases for target products only
            prisma.goodsReceiptItem.findMany({
                where: { productId: { in: targetProductIds }, receipt: { isVoid: false } },
                include: { 
                    receipt: { select: { date: true, createdAt: true, receiptNumber: true, formNumber: true, receivedFrom: true, salesPerson: true, taxRate: true, warehouse: { select: { name: true } } } },
                    product: { select: { sku: true, name: true, uom: true } }
                },
                orderBy: [{ receipt: { date: 'asc' } }, { receipt: { createdAt: 'asc' } }]
            }),
            // Sales for target products only
            prisma.salesDeliveryItem.findMany({
                where: { productId: { in: targetProductIds }, delivery: { isVoid: false } },
                include: { 
                    delivery: { select: { date: true, createdAt: true, deliveryNumber: true, poNumber: true, buyerName: true, recipient: true, salesPerson: true, taxRate: true, warehouse: { select: { name: true } } } },
                    product: { select: { sku: true, name: true, uom: true } }
                },
                orderBy: [{ delivery: { date: 'asc' } }, { delivery: { createdAt: 'asc' } }]
            }),
            // Purchase returns for target products
            prisma.purchaseReturnItem.findMany({
                where: { productId: { in: targetProductIds }, purchaseReturn: { status: 'COMPLETED' } },
                select: { productId: true, quantity: true, purchaseReturn: { select: { receiptId: true } } }
            }),
            // Sales returns for target products
            prisma.salesReturnItem.findMany({
                where: { productId: { in: targetProductIds }, salesReturn: { status: 'COMPLETED' } },
                select: { productId: true, quantity: true, salesReturn: { select: { deliveryId: true } } }
            })
        ]);

        // STEP 3: Pre-compute return Maps for O(1) lookup
        // Key: "receiptId|productId" -> total returned qty
        const purchaseReturnMap = new Map<string, number>();
        for (const r of allPurchaseReturns) {
            const key = `${r.purchaseReturn.receiptId}|${r.productId}`;
            purchaseReturnMap.set(key, (purchaseReturnMap.get(key) || 0) + r.quantity);
        }
        // Key: "deliveryId|productId" -> total returned qty
        const salesReturnMap = new Map<string, number>();
        for (const r of allSalesReturns) {
            const key = `${r.salesReturn.deliveryId}|${r.productId}`;
            salesReturnMap.set(key, (salesReturnMap.get(key) || 0) + r.quantity);
        }

        // STEP 4: Group by Product
        const productStats: Record<string, { buyers: any[], sellers: any[] }> = {};

        for (const item of allLPBItems) {
            if (!productStats[item.productId]) productStats[item.productId] = { buyers: [], sellers: [] };
            
            const retKey = `${item.receiptId}|${item.productId}`;
            const itemReturns = purchaseReturnMap.get(retKey) || 0;

            productStats[item.productId].buyers.push({
                date: item.receipt.date,
                number: item.receipt.receiptNumber,
                formNumber: item.receipt.formNumber,
                receivedFrom: item.receipt.receivedFrom,
                salesPerson: item.receipt.salesPerson || "-",
                qtyGross: item.quantity,
                qtyRet: itemReturns,
                qtyNet: item.quantity - itemReturns,
                remaining: item.quantity - itemReturns,
                price: Number(item.purchasePrice || 0),
                disc: Number(item.discount || 0),
                taxRate: Number(item.receipt.taxRate || 0),
                sku: item.product.sku,
                name: item.product.name,
                uom: item.product.uom,
                warehouse: item.receipt.warehouse?.name || "Pusat"
            });
        }

        for (const item of allSJItems) {
            if (!productStats[item.productId]) productStats[item.productId] = { buyers: [], sellers: [] };

            const retKey = `${item.deliveryId}|${item.productId}`;
            const itemReturns = salesReturnMap.get(retKey) || 0;

            productStats[item.productId].sellers.push({
                date: item.delivery.date,
                number: item.delivery.deliveryNumber,
                poNumber: item.delivery.poNumber || "-",
                buyerName: item.delivery.buyerName || item.delivery.recipient || "UMUM",
                salesPerson: item.delivery.salesPerson || "-",
                qtyGross: item.quantity,
                qtyRet: itemReturns,
                qtyNet: item.quantity - itemReturns,
                price: Number(item.salesPrice || 0),
                disc: Number(item.discount || 0),
                taxRate: Number(item.delivery.taxRate || 0),
                product: item.product,
                warehouse: item.delivery.warehouse?.name || "Pusat"
            });
        }

        // STEP 5: FIFO Allocation (Global SKU Flow)
        const finalRows: any[] = [];

        for (const productId in productStats) {
            const { buyers, sellers } = productStats[productId];
            let buyerIdx = 0;

            for (const sale of sellers) {
                let qtyToAllocate = sale.qtyNet;

                while (qtyToAllocate > 0 && buyerIdx < buyers.length) {
                    const batch = buyers[buyerIdx];
                    if (batch.remaining <= 0) { buyerIdx++; continue; }

                    const taken = Math.min(qtyToAllocate, batch.remaining);
                    
                    if (sale.date >= startDate && sale.date <= endDate) {
                        finalRows.push(formatTraceabilityRow(sale, batch, taken));
                    }

                    batch.remaining -= taken;
                    qtyToAllocate -= taken;
                    if (batch.remaining <= 0) buyerIdx++;
                }

                // Oversell (no more LPB batches)
                if (qtyToAllocate > 0 && sale.date >= startDate && sale.date <= endDate) {
                    finalRows.push(formatTraceabilityRow(sale, null, qtyToAllocate));
                }
            }
        }

        return finalRows.sort((a, b) => {
            const dateA = new Date(a['Tanggal'].split('/').reverse().join('-')).getTime();
            const dateB = new Date(b['Tanggal'].split('/').reverse().join('-')).getTime();
            return dateB - dateA;
        });

    } catch (error: any) {
        console.error("[getProductTraceabilityService] FIFO ERROR:", error);
        throw new Error(`FIFO Error: ${error.message}`);
    }
}

/**
 * Helper to format a single matched row
 */
function formatTraceabilityRow(sale: any, buy: any, matchedQty: number) {
    const buyPrice = buy ? Number(buy.price || 0) : 0;
    const sellPrice = Number(sale.price || 0);
    const buyDisc = buy ? Number(buy.disc || 0) : 0;
    const sellDisc = Number(sale.disc || 0);
    const buyTaxRate = buy ? Number(buy.taxRate || 0) : 0;
    const sellTaxRate = Number(sale.taxRate || 0);

    const buyTotal = matchedQty * (buyPrice - buyDisc); 
    const sellTotal = matchedQty * (sellPrice - sellDisc);

    // Always use product info from SALE if BUY is missing
    const productSKU = buy?.sku || sale.product?.sku || "-";
    const productName = buy?.name || sale.product?.name || "-";
    const productUOM = buy?.uom || sale.product?.uom || "KARTON";

    return {
        'Satuan': productUOM,
        'SKU': productSKU,
        'Nama Barang': productName,
        'Tanggal': sale.date ? new Date(sale.date).toLocaleDateString('id-ID') : "-",
        
        // --- INFO PEMBELIAN (KIRI) ---
        '[BELI] Tgl': buy?.date ? new Date(buy.date).toLocaleDateString('id-ID') : "-",
        '[BELI] No. LPB': buy?.number || "[SALDO AWAL / BELUM INPUT]",
        '[BELI] No. SJ Supplier': buy?.formNumber || "-",
        '[BELI] Supplier': buy?.receivedFrom || (buy ? "UMUM" : "-"),
        '[BELI] Sales (BC/PF)': buy?.salesPerson || "-",
        '[BELI] Qty Asli': buy?.qtyGross || 0,
        '[BELI] Qty Retur': buy?.qtyRet || 0,
        '[BELI] Qty Bersih': buy?.qtyNet || 0,
        '[BELI] Harga Satuan': buyPrice,
        '[BELI] PPN (%)': buyTaxRate > 0 ? `${buyTaxRate}%` : "0%",
        
        // --- INFO PENJUALAN (KANAN) ---
        '[JUAL] No. TRN': sale.number || "-",
        '[JUAL] No. PO Buyer': sale.poNumber || "-",
        '[JUAL] Buyer / Customer': sale.buyerName || sale.recipient || "UMUM",
        '[JUAL] Sales (BC/PF)': sale.salesPerson || "-",
        '[JUAL] Qty Penjodoh': matchedQty, // Qty that specifically matches this LPB
        '[JUAL] Qty Asli': sale.qtyGross,
        '[JUAL] Qty Retur': sale.qtyRet,
        '[JUAL] Qty Jual Bersih': sale.qtyNet,
        '[JUAL] Harga Jual Satuan': sellPrice,
        '[JUAL] PPN (%)': sellTaxRate > 0 ? `${sellTaxRate}%` : "0%",
        '[JUAL] Total Nilai Jual': sellTotal,
        
        // --- ANALYSIS ---
        'Margin Estimasi (Rp)': Math.round(sellTotal - buyTotal),
        'Gudang': sale.warehouse || buy?.warehouse || "Pusat"
    };
}


/**
 * PURCHASE RETURNS DETAIL REPORT
 */
export async function getPurchaseReturnsDetailService() {
    const prisma = getPrisma();
    return await prisma.purchaseReturnItem.findMany({
        select: {
            quantity: true,
            reason: true,
            product: { select: { sku: true, name: true, uom: true } },
            purchaseReturn: {
                select: {
                    returnNumber: true,
                    date: true,
                    status: true,
                    receipt: { select: { receiptNumber: true, receivedFrom: true } }
                }
            }
        },
        orderBy: { purchaseReturn: { date: 'desc' } }
    });
}

/**
 * SALES RETURNS DETAIL REPORT
 */
export async function getSalesReturnsDetailService() {
    const prisma = getPrisma();
    return await prisma.salesReturnItem.findMany({
        select: {
            quantity: true,
            reason: true,
            product: { select: { sku: true, name: true, uom: true } },
            salesReturn: {
                select: {
                    returnNumber: true,
                    date: true,
                    status: true,
                    delivery: { select: { deliveryNumber: true, recipient: true, buyerName: true } }
                }
            }
        },
        orderBy: { salesReturn: { date: 'desc' } }
    });
}
