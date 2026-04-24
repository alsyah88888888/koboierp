import { getPrisma } from "@/lib/prisma";

/**
 * FIFO TRACEABILITY SERVICE
 * Matches every sales item to its original purchase batch (FIFO)
 * and calculates the margin for each unit sold.
 */
export async function getProductTraceabilityService(month?: number, year?: number) {
    const prisma = getPrisma();
    
    const filterYear = year || new Date().getFullYear();
    const filterMonth = month || (new Date().getMonth() + 1);
    const startDate = new Date(filterYear, filterMonth - 1, 1);
    const endDate = new Date(filterYear, filterMonth, 0, 23, 59, 59);

    try {
        // 1. Fetch ALL Goods Receipts up to end of period to build FIFO Purchase Pool
        const receipts = await prisma.goodsReceipt.findMany({
            where: { isVoid: false, date: { lte: endDate } },
            include: { items: { include: { product: { select: { sku: true, name: true, uom: true } } } } },
            orderBy: { date: 'asc' }
        });

        // 2. Build Inventory Pool per product and vendor (Vendor-Aware FIFO)
        type Batch = { qty: number; price: number; date: Date | null; grNumber: string; supplier: string };
        const pool = new Map<string, Batch[]>();

        for (const gr of receipts) {
            for (const item of gr.items) {
                // Key is ProductId + VendorName to ensure we match sales to the correct source
                const key = `${item.productId}_${gr.receivedFrom || "UMUM"}`;
                if (!pool.has(key)) pool.set(key, []);
                pool.get(key)!.push({
                    qty     : item.quantity,
                    price   : Number(item.purchasePrice),
                    date    : gr.date,
                    grNumber: gr.receiptNumber,
                    supplier: gr.receivedFrom
                });
            }
        }

        // 3. Fetch Sales Deliveries in target period
        const deliveries = await prisma.salesDelivery.findMany({
            where: { isVoid: false, date: { gte: startDate, lte: endDate } },
            include: {
                items: { include: { product: { select: { sku: true, name: true, uom: true } } } }
            },
            orderBy: { date: 'asc' }
        });

        // Fetch SO numbers separately
        const orderIds = deliveries.map((d: any) => d.orderId).filter(Boolean) as string[];
        const salesOrders = orderIds.length > 0
            ? await (prisma as any).salesOrder.findMany({
                where: { id: { in: orderIds } },
                select: { id: true, orderNumber: true }
              })
            : [];
        const orderNumberMap = new Map<string, string>(salesOrders.map((o: any) => [o.id, o.orderNumber]));

        const report: Record<string, any>[] = [];

        // 4. Vendor-Aware FIFO Pairing
        for (const sd of deliveries) {
            for (const sdItem of sd.items) {
                // Match based on both Product and the Vendor selected in the Sales UI
                const vendorKey = `${sdItem.productId}_${sdItem.vendorName || "UMUM"}`;
                const productPool = pool.get(vendorKey) ?? [];
                let remaining = sdItem.quantity;

                while (remaining > 0) {
                    // Skip exhausted batches in this vendor's pool
                    while (productPool.length > 0 && productPool[0].qty <= 0) productPool.shift();

                    if (productPool.length === 0) {
                        // Deficit or Vendor mismatch — record as unbatched row
                        const sellPrice = Number(sdItem.salesPrice || 0);
                        report.push({
                            'Tgl Beli'            : '-',
                            'No. GR (Batch Beli)' : '-',
                            'Supplier'            : sdItem.vendorName || '-',
                            'HPP Per Unit (Rp)'   : 0,
                            'Tgl Jual'            : new Date(sd.date).toLocaleDateString('id-ID'),
                            'No. SJ'              : sd.deliveryNumber,
                            'No. SO'              : orderNumberMap.get((sd as any).orderId ?? '') ?? (sd as any).poNumber ?? '-',
                            'Buyer'               : sd.buyerName || sd.recipient,
                            'SKU'                 : sdItem.product.sku,
                            'Nama Barang'         : sdItem.product.name,
                            'Satuan'              : sdItem.product.uom || 'PCS',
                            'QTY'                 : remaining,
                            'Harga Jual Per Unit (Rp)': sellPrice,
                            'Profit Per Unit (Rp)': 0,
                            'Total Profit (Rp)'   : 0,
                            'Margin %'            : '0.0%',
                            'Status'              : `STOK TIDAK DITEMUKAN (${sdItem.vendorName})`
                        });
                        remaining = 0;
                        break;
                    }

                    const batch = productPool[0];
                    const matched      = Math.min(remaining, batch.qty);
                    const sellPrice    = Number(sdItem.salesPrice || 0);
                    const profitUnit   = sellPrice - batch.price;
                    const totalProfit  = profitUnit * matched;
                    const marginPct    = sellPrice > 0
                        ? Math.round(((sellPrice - batch.price) / sellPrice) * 1000) / 10
                        : 0;

                    report.push({
                        'Tgl Beli'            : batch.date ? new Date(batch.date).toLocaleDateString('id-ID') : '-',
                        'No. GR (Batch Beli)' : batch.grNumber,
                        'Supplier'            : batch.supplier,
                        'HPP Per Unit (Rp)'   : batch.price,
                        'Tgl Jual'            : new Date(sd.date).toLocaleDateString('id-ID'),
                        'No. SJ'              : sd.deliveryNumber,
                        'No. SO'              : orderNumberMap.get((sd as any).orderId ?? '') ?? (sd as any).poNumber ?? '-',
                        'Buyer'               : sd.buyerName || sd.recipient,
                        'SKU'                 : sdItem.product.sku,
                        'Nama Barang'         : sdItem.product.name,
                        'Satuan'              : sdItem.product.uom || 'PCS',
                        'QTY'                 : matched,
                        'Harga Jual Per Unit (Rp)': sellPrice,
                        'Profit Per Unit (Rp)': Math.round(profitUnit),
                        'Total Profit (Rp)'   : Math.round(totalProfit),
                        'Margin %'            : `${marginPct.toFixed(1)}%`,
                        'Status'              : 'TERJUAL'
                    });

                    batch.qty -= matched;
                    remaining -= matched;
                }
            }
        }

        return report;

    } catch (error: any) {
        console.error("[getProductTraceabilityService] ERROR:", error);
        throw new Error(`Traceability Error: ${error.message}`);
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
