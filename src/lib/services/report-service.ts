
/**
 * REPORT SERVICES - MATCHED TRACEABILITY (BUY/SELL PAIRING)
 */

export async function getProductTraceabilityService() {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    // 1. Fetch all Sales Items with full context (TRN/TRD)
    const salesItems = await prisma.salesDeliveryItem.findMany({
        include: {
            product: true,
            delivery: {
                include: {
                    warehouse: true
                }
            }
        },
        orderBy: { delivery: { date: 'desc' } }
    });

    // 2. Fetch all Purchase Items (LPB/LPBD) for matching
    const purchaseItems = await prisma.goodsReceiptItem.findMany({
        include: {
            receipt: true
        },
        orderBy: { receipt: { date: 'desc' } } // Target the latest purchase first
    });

    // 3. Optimization: Build a Map for Purchase Items (O(1) Lookup)
    const purchaseMap = new Map();
    purchaseItems.forEach((pi: any) => {
        const key = `${pi.productId}_${pi.receipt.receivedFrom}`;
        if (!purchaseMap.has(key)) {
            purchaseMap.set(key, pi);
        }
    });

    const reportData: any[] = [];

    // 4. Anchor report on Sales to show the "Buying Source" for each sale
    salesItems.forEach((si: any) => {
        const key = `${si.productId}_${si.vendorName}`;
        const match = purchaseMap.get(key);

        const buyTax = match ? Number(match.receipt.taxRate || 0) : 0; // Fix PPN (don't multiply by 100)
        const sellTax = Number(si.delivery.taxRate || 0);

        const buyPrice = match ? Number(match.purchasePrice || 0) : 0;
        const sellPrice = Number(si.salesPrice || 0);
        
        const buyTotal = Number(si.quantity) * (buyPrice - Number(match?.discount || 0));
        const sellTotal = Number(si.quantity) * (sellPrice - Number(si.discount || 0));

        reportData.push({
            'SKU': si.product.sku,
            'Nama Barang': si.product.name,
            'Satuan': si.product.uom || "PCS",
            
            // --- INFO PEMBELIAN (KIRI) ---
            '[BELI] Tgl': match ? (match.receipt.date || match.receipt.createdAt).toLocaleDateString('id-ID') : "-",
            '[BELI] No. LPB': match ? match.receipt.receiptNumber : "-",
            '[BELI] No. SJ Supplier': match ? (match.receipt.formNumber || "-") : "-",
            '[BELI] Supplier': si.vendorName || (match ? match.receipt.receivedFrom : "UMUM"),
            '[BELI] Harga Satuan': buyPrice,
            '[BELI] PPN (%)': buyTax > 0 ? `${buyTax}%` : "0%",
            
            // --- INFO PENJUALAN (KANAN) ---
            'Tanggal Transaksi': si.delivery.date || si.delivery.createdAt, // For sorting
            '[JUAL] No. TRN': si.delivery.deliveryNumber,
            '[JUAL] No. PO Buyer': si.delivery.poNumber || "-",
            '[JUAL] Buyer / Customer': si.delivery.buyerName || si.delivery.recipient || "UMUM",
            'Qty Jual': si.quantity,
            '[JUAL] Harga Jual Satuan': sellPrice,
            '[JUAL] PPN (%)': sellTax > 0 ? `${sellTax}%` : "0%",
            '[JUAL] Total Nilai Jual': sellTotal,
            
            // --- ANALYSIS ---
            'Margin Estimasi (Rp)': sellTotal - buyTotal,
            'Gudang': si.delivery.warehouse?.name || "Pusat",
            'Catatan': si.delivery.notes || "-"
        });
    });

    // 5. Sort chronologically by Sale Date
    reportData.sort((a, b) => new Date(a['Tanggal Transaksi']).getTime() - new Date(b['Tanggal Transaksi']).getTime());

    // 6. Final format and cleanup
    return reportData.map((r: any) => {
        const { 'Tanggal Transaksi': rawDate, ...rest } = r;
        return {
            ...rest,
            'Tanggal': new Date(rawDate).toLocaleDateString('id-ID')
        };
    });
}
