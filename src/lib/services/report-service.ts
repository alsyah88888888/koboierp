
import { getPrisma } from "@/lib/prisma";

/**
 * ADVANCED FIFO TRACEABILITY (BUY/SELL PAIRING)
 */
export async function getProductTraceabilityService(month?: number, year?: number) {
    const prisma = getPrisma();
    
    // Handle defaults if not provided
    const filterYear = year || new Date().getFullYear();
    const filterMonth = month || (new Date().getMonth() + 1);
    const startDate = new Date(filterYear, filterMonth - 1, 1);
    const endDate = new Date(filterYear, filterMonth, 0, 23, 59, 59);

    try {
        // 1. Fetch ALL historical data for the products involved to ensure accurate FIFO
        const allLPBItems = await prisma.goodsReceiptItem.findMany({
            where: { receipt: { isVoid: false } },
            include: { 
                receipt: { include: { warehouse: true } },
                product: true
            },
            orderBy: [{ receipt: { date: 'asc' } }, { receipt: { createdAt: 'asc' } }]
        });

        const allSJItems = await prisma.salesDeliveryItem.findMany({
            where: { delivery: { isVoid: false } },
            include: { 
                delivery: { include: { warehouse: true } },
                product: true
            },
            orderBy: [{ delivery: { date: 'asc' } }, { delivery: { createdAt: 'asc' } }]
        });

        const allPurchaseReturns = await prisma.purchaseReturnItem.findMany({
            where: { purchaseReturn: { status: 'COMPLETED' } },
            include: { purchaseReturn: true }
        });

        const allSalesReturns = await prisma.salesReturnItem.findMany({
            where: { salesReturn: { status: 'COMPLETED' } },
            include: { salesReturn: true }
        });

        // 2. Normalize and Group by [ProductId][VendorKey]
        const productStats: Record<string, Record<string, { buyers: any[], sellers: any[] }>> = {};

        function getVendorKey(name: string | null) {
            if (!name || name.trim() === "" || name.toUpperCase() === "UMUM") return "UMUM";
            return name.trim().toUpperCase();
        }

        // Process LPBs into Groups
        for (const item of allLPBItems) {
            const pId = item.productId;
            const vKey = getVendorKey(item.receipt.receivedFrom);
            
            if (!productStats[pId]) productStats[pId] = {};
            if (!productStats[pId][vKey]) productStats[pId][vKey] = { buyers: [], sellers: [] };

            const itemReturns = allPurchaseReturns
                .filter(r => r.purchaseReturn.receiptId === item.receiptId && r.productId === item.productId)
                .reduce((sum, r) => sum + r.quantity, 0);

            productStats[pId][vKey].buyers.push({
                productId: item.productId,
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

        // Process SJs into Groups
        for (const item of allSJItems) {
            const pId = item.productId;
            const vKey = getVendorKey(item.vendorName);
            
            if (!productStats[pId]) productStats[pId] = {};
            if (!productStats[pId][vKey]) productStats[pId][vKey] = { buyers: [], sellers: [] };

            const itemReturns = allSalesReturns
                .filter(r => r.salesReturn.deliveryId === item.deliveryId && r.productId === item.productId)
                .reduce((sum, r) => sum + r.quantity, 0);

            productStats[pId][vKey].sellers.push({
                productId: item.productId,
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

        // 3. FIFO Allocation per Vendor Group
        const finalRows: any[] = [];

        for (const productId in productStats) {
            for (const vendorKey in productStats[productId]) {
                const { buyers, sellers } = productStats[productId][vendorKey];
                
                let buyerIdx = 0;

                for (const sale of sellers) {
                    let qtyToAllocate = sale.qtyNet;

                    while (qtyToAllocate > 0 && buyerIdx < buyers.length) {
                        const batch = buyers[buyerIdx];
                        
                        if (batch.remaining <= 0) {
                            buyerIdx++;
                            continue;
                        }

                        const taken = Math.min(qtyToAllocate, batch.remaining);
                        
                        // Only add to report if the SALE falls within the requested period
                        if (sale.date >= startDate && sale.date <= endDate) {
                            finalRows.push(formatTraceabilityRow(sale, batch, taken));
                        }

                        batch.remaining -= taken;
                        qtyToAllocate -= taken;

                        if (batch.remaining <= 0) buyerIdx++;
                    }

                    // Handle Oversell (Remaining Qty with no LPB pairing in this vendor group)
                    if (qtyToAllocate > 0 && sale.date >= startDate && sale.date <= endDate) {
                        finalRows.push(formatTraceabilityRow(sale, null, qtyToAllocate));
                    }
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
