
import { getPrisma } from "@/lib/prisma";

/**
 * OPTIMIZED FIFO TRACEABILITY (BUY/SELL PAIRING)
 * Performance: Only loads data for products sold in the target month.
 * Uses pre-computed Maps for O(1) return lookups.
 */
/**
 * ENRICHED TRANSACTION HISTORY REPORT (STOCK CARD STYLE)
 * This replaces the old FIFO traceability with a chronological audit trail.
 * It includes running balances, partner names, and profit margins.
 */
export async function getProductTraceabilityService(month?: number, year?: number) {
    const prisma = getPrisma();
    
    const filterYear = year || new Date().getFullYear();
    const filterMonth = month || (new Date().getMonth() + 1);
    const startDate = new Date(filterYear, filterMonth - 1, 1);
    const endDate = new Date(filterYear, filterMonth, 0, 23, 59, 59);

    try {
        // 1. Fetch ALL Stock Movements in range
        const movements = await prisma.stockMovement.findMany({
            where: { createdAt: { gte: startDate, lte: endDate } },
            include: { 
                product: { select: { sku: true, name: true, uom: true, purchasePrice: true } },
                warehouse: { select: { name: true } }
            },
            orderBy: { createdAt: 'asc' }
        });

        if (movements.length === 0) return [];

        // 2. Identify all products involved to get opening balances
        const productIds = Array.from(new Set(movements.map((m: any) => m.productId)));
        
        // 3. Calculate Opening Balances (Saldo Awal) for each product
        const openingBalancesAgg = await prisma.stockMovement.groupBy({
            by: ['productId'],
            where: {
                productId: { in: productIds },
                createdAt: { lt: startDate }
            },
            _sum: { quantity: true }
        });
        
        const openingBalanceMap = new Map<string, number>();
        openingBalancesAgg.forEach((agg: any) => {
            openingBalanceMap.set(agg.productId, Number(agg._sum.quantity || 0));
        });

        // 4. Fetch Transaction Details (Partner names, Prices)
        const grRefs = movements.filter((m: any) => m.type === 'GOODS_RECEIPT' || m.type === 'PURCHASE_VOID').map((m: any) => m.reference).filter(Boolean);
        const sdRefs = movements.filter((m: any) => m.type === 'SALE' || m.type === 'SALE_VOID' || m.type === 'SALE_DELETE').map((m: any) => m.reference).filter(Boolean);

        const [receipts, deliveries] = await Promise.all([
            prisma.goodsReceipt.findMany({
                where: { receiptNumber: { in: grRefs } },
                include: { items: true }
            }),
            prisma.salesDelivery.findMany({
                where: { deliveryNumber: { in: sdRefs } },
                include: { items: true }
            })
        ]);

        const receiptMap = new Map<string, any>();
        receipts.forEach((r: any) => receiptMap.set(r.receiptNumber, r));

        const deliveryMap = new Map<string, any>();
        deliveries.forEach((d: any) => deliveryMap.set(d.deliveryNumber, d));

        // 5. Build the Report Rows
        const runningBalances = new Map<string, number>();
        // Initialize running balances with opening balances
        productIds.forEach(id => runningBalances.set(id, openingBalanceMap.get(id) || 0));

        const finalRows = movements.map((m: any) => {
            const currentBal = runningBalances.get(m.productId) || 0;
            const newBal = currentBal + Number(m.quantity);
            runningBalances.set(m.productId, newBal);

            let partner = "-";
            let price = 0;
            let buyPrice = Number(m.product.purchasePrice || 0);
            let margin = 0;
            let refNum = m.reference || "-";

            // Enrich based on type
            if (m.type === 'GOODS_RECEIPT' || m.type === 'PURCHASE_VOID') {
                const gr = receiptMap.get(m.reference);
                if (gr) {
                    partner = gr.receivedFrom;
                    const item = gr.items.find((i: any) => i.productId === m.productId);
                    if (item) buyPrice = Number(item.purchasePrice || 0);
                }
            } else if (m.type === 'SALE' || m.type === 'SALE_VOID' || m.type === 'SALE_DELETE') {
                const sd = deliveryMap.get(m.reference);
                if (sd) {
                    partner = sd.buyerName || sd.recipient || "UMUM";
                    const item = sd.items.find((i: any) => i.productId === m.productId);
                    if (item) {
                        price = Number(item.salesPrice || 0);
                        margin = (price - buyPrice) * Math.abs(Number(m.quantity));
                    }
                }
            } else if (m.type === 'ADJUSTMENT') {
                partner = "[STOCK ADJUSTMENT]";
            }

            return {
                'Tanggal': new Date(m.createdAt).toLocaleDateString('id-ID'),
                'Jam': new Date(m.createdAt).toLocaleTimeString('id-ID'),
                'SKU': m.product.sku,
                'Nama Barang': m.product.name,
                'Tipe': m.type.replace('_', ' '),
                'No. Ref': refNum,
                'Partner': partner,
                'Gudang': m.warehouse?.name || "Pusat",
                'Masuk': Number(m.quantity) > 0 ? Number(m.quantity) : 0,
                'Keluar': Number(m.quantity) < 0 ? Math.abs(Number(m.quantity)) : 0,
                'Saldo Berjalan': newBal,
                'HPP / Harga Beli': buyPrice,
                'Harga Jual': price > 0 ? price : "-",
                'Estimasi Margin': margin !== 0 ? Math.round(margin) : "-",
                'Satuan': m.product.uom || "PCS"
            };
        });

        // Return sorted by Date DESC (latest first for easier reading)
        return finalRows.reverse();

    } catch (error: any) {
        console.error("[getEnrichedTransactionReportService] FATAL ERROR:", error);
        throw new Error(`Report Error: ${error.message}`);
    }
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
