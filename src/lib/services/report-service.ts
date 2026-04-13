
/**
 * REPORT SERVICES - ADVANCED LIFECYCLE TRACEABILITY (BUY/SELL/RETURN/STOCK)
 */

export async function getProductTraceabilityService() {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    // 1. Fetch all relevant transaction items
    const [salesItems, purchaseItems, salesReturns, purchaseReturns] = await Promise.all([
        prisma.salesDeliveryItem.findMany({
            include: { product: true, delivery: { include: { warehouse: true } } },
            orderBy: { delivery: { date: 'desc' } }
        }),
        prisma.goodsReceiptItem.findMany({
            include: { product: true, receipt: { include: { warehouse: true } } },
            orderBy: { receipt: { date: 'desc' } }
        }),
        prisma.salesReturnItem.findMany({
            include: { product: true, salesReturn: { include: { delivery: true } } }
        }),
        prisma.purchaseReturnItem.findMany({
            include: { product: true, purchaseReturn: { include: { receipt: true } } }
        })
    ]);

    // 2. Optimization: Indexes
    const purchaseMap = new Map();
    const usedPurchaseIds = new Set();
    
    purchaseItems.forEach((pi: any) => {
        const key = `${pi.productId}_${pi.receipt.receivedFrom}`;
        if (!purchaseMap.has(key)) purchaseMap.set(key, pi);
    });

    const reportData: any[] = [];

    // Helper to generate a standardized row
    const createRow = (type: string, date: any, item: any, match: any = null, isReturn: boolean = false) => {
        const buyPrice = match ? Number(match.purchasePrice) : 0;
        const sellPrice = isReturn && type.includes("JUAL") ? Number(item.deliveryItem?.salesPrice || 0) : Number(item.salesPrice || 0);
        
        const qChar = isReturn ? -1 : 1;
        const qty = (item.quantity || 0) * qChar;

        return {
            '_sku': item.product.sku, // For sorting
            '_date': date || new Date(),
            
            'SKU': item.product.sku,
            'Nama Barang': item.product.name,
            'Satuan': item.product.uom || "PCS",
            'Jenis Gerak': type,
            
            // --- INFO PEMBELIAN ---
            '[BELI] Tgl': match ? (match.receipt.date || match.receipt.createdAt).toLocaleDateString('id-ID') : "-",
            '[BELI] No. LPB': match ? match.receipt.receiptNumber : "-",
            '[BELI] Supplier': match ? match.receipt.receivedFrom : "-",
            '[BELI] Harga Satuan': buyPrice,
            
            // --- INFO PENJUALAN ---
            '[JUAL] Tgl': date ? new Date(date).toLocaleDateString('id-ID') : "-",
            '[JUAL] No. TRN': item.delivery?.deliveryNumber || item.salesReturn?.returnNumber || item.purchaseReturn?.returnNumber || "-",
            '[JUAL] Buyer / Customer': item.delivery?.buyerName || item.delivery?.recipient || item.salesReturn?.delivery?.buyerName || "-",
            'Quantity': qty,
            '[JUAL] Harga Jual Satuan': type.includes("JUAL") ? sellPrice : 0,
            
            // --- FISCAL ---
            'PPN (%)': (Number(item.delivery?.taxRate || match?.receipt?.taxRate || 0)).toString() + "%",
            'Gudang': item.delivery?.warehouse?.name || match?.receipt?.warehouse?.name || "Pusat",
            'Catatan': item.notes || item.reason || "-"
        };
    };

    // 3. Process Sales (TRN)
    salesItems.forEach((si: any) => {
        const key = `${si.productId}_${si.vendorName}`;
        const match = purchaseMap.get(key);
        if (match) usedPurchaseIds.add(match.id);
        
        reportData.push(createRow('PENJUALAN', si.delivery.date || si.delivery.createdAt, si, match));
    });

    // 4. Process Sales Returns 
    salesReturns.forEach((sr: any) => {
        const match = purchaseItems.find((pi: any) => pi.productId === sr.productId); // Broad match for returns
        reportData.push(createRow('RETUR JUAL (MASUK)', sr.salesReturn.date, sr, match, true));
    });

    // 5. Process Purchase Returns 
    purchaseReturns.forEach((pr: any) => {
        const match = purchaseItems.find((pi: any) => pi.receiptId === pr.purchaseReturn.receiptId && pi.productId === pr.productId);
        reportData.push(createRow('RETUR BELI (KELUAR)', pr.purchaseReturn.date, pr, match, true));
    });

    // 6. Process "Orphan" Purchases (Stock not yet sold)
    purchaseItems.forEach((pi: any) => {
        if (!usedPurchaseIds.has(pi.id)) {
            reportData.push({
                '_sku': pi.product.sku,
                '_date': pi.receipt.date || pi.receipt.createdAt,
                'SKU': pi.product.sku,
                'Nama Barang': pi.product.name,
                'Satuan': pi.product.uom || "PCS",
                'Jenis Gerak': 'STOK TERSEDIA (BELUM TERJUAL)',
                '[BELI] Tgl': (pi.receipt.date || pi.receipt.createdAt).toLocaleDateString('id-ID'),
                '[BELI] No. LPB': pi.receipt.receiptNumber,
                '[BELI] Supplier': pi.receipt.receivedFrom,
                '[BELI] Harga Satuan': Number(pi.purchasePrice),
                '[JUAL] Tgl': "-",
                '[JUAL] No. TRN': "-",
                '[JUAL] Buyer / Customer': "-",
                'Quantity': pi.quantity,
                '[JUAL] Harga Jual Satuan': 0,
                'PPN (%)': Number(pi.receipt.taxRate || 0).toString() + "%",
                'Gudang': pi.receipt.warehouse?.name || "Pusat",
                'Catatan': "Idle Stock"
            });
        }
    });

    // 7. FINAL SORTING: By SKU, then by Date
    reportData.sort((a, b) => {
        if (a._sku !== b._sku) return a._sku.localeCompare(b._sku);
        return new Date(a._date).getTime() - new Date(b._date).getTime();
    });

    // Clean up internal _ fields
    return reportData.map(({ _sku, _date, ...rest }) => rest);
}
