
/**
 * REPORT SERVICES - OPTIMIZED INTEGRATED (MATCHED BUY/SELL)
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

    // 2. Fetch all Purchase Items (LPB/LPBD)
    const purchaseItems = await prisma.goodsReceiptItem.findMany({
        include: {
            receipt: true
        },
        orderBy: { receipt: { date: 'desc' } } // Latest first
    });

    // 3. OPTIMIZATION: Build a Map for Purchase Items (O(1) Lookup)
    // Key: ProductID + SupplierName
    const purchaseMap = new Map();
    purchaseItems.forEach((pi: any) => {
        const key = `${pi.productId}_${pi.receipt.receivedFrom}`;
        // Since sorted by date desc, only keep the first (latest) one for each key
        if (!purchaseMap.has(key)) {
            purchaseMap.set(key, pi);
        }
    });

    const reportData: any[] = [];

    // 4. Match each Sale with its corresponding Purchase
    salesItems.forEach((si: any) => {
        const key = `${si.productId}_${si.vendorName}`;
        const match = purchaseMap.get(key);

        const buyTax = match ? Number(match.receipt.taxRate || 0) * 100 : 0;
        const sellTax = Number(si.delivery.taxRate || 0) * 100;

        const buyPrice = match ? Number(match.purchasePrice) : 0;
        const sellPrice = Number(si.salesPrice || 0);
        
        const buyTotal = Number(si.quantity) * (buyPrice - Number(match?.discount || 0));
        const sellTotal = Number(si.quantity) * (sellPrice - Number(si.discount || 0));

        reportData.push({
            // Primary Date for sorting (Raw Date Object)
            '_tempDate': si.delivery.date || si.delivery.createdAt,
            
            'SKU': si.product.sku,
            'Nama Barang': si.product.name,
            'Satuan': si.product.uom || "PCS",
            
            // --- INFO PEMBELIAN (LPB/LPBD) ---
            '[BELI] Tgl': match ? (match.receipt.date || match.receipt.createdAt).toLocaleDateString('id-ID') : "-",
            '[BELI] No. LPB': match ? match.receipt.receiptNumber : "-",
            '[BELI] No. SJ Supplier': match ? (match.receipt.formNumber || "-") : "-",
            '[BELI] Supplier': si.vendorName || (match ? match.receipt.receivedFrom : "UMUM"),
            '[BELI] Harga Satuan': buyPrice,
            '[BELI] PPN Beli (%)': buyTax > 0 ? `${buyTax}%` : "0%",
            
            // --- INFO PENJUALAN (TRN/TRD) ---
            'Tanggal': si.delivery.date || si.delivery.createdAt, // We will format this last
            '[JUAL] No. TRN': si.delivery.deliveryNumber,
            '[JUAL] No. PO Buyer': si.delivery.poNumber || "-",
            '[JUAL] Buyer / Customer': si.delivery.buyerName || si.delivery.recipient || "UMUM",
            '[JUAL] Sales (BC/PF)': si.delivery.salesPerson || "-",
            'Qty Jual': si.quantity,
            '[JUAL] Harga Jual Satuan': sellPrice,
            '[JUAL] PPN Jual (%)': sellTax > 0 ? `${sellTax}%` : "0%",
            '[JUAL] Total Nilai Jual': sellTotal,
            
            // --- ANALYSIS ---
            'Margin Estimasi (Rp)': sellTotal - buyTotal,
            'Gudang': si.delivery.warehouse?.name || "Pusat",
            'Catatan': si.delivery.notes || "-"
        });
    });

    // 5. Sort by Raw Date
    reportData.sort((a, b) => new Date(a._tempDate).getTime() - new Date(b._tempDate).getTime());

    // 6. Format Final Date Column and Clean Up temp fields
    return reportData.map((r: any) => {
        const { _tempDate, ...rest } = r;
        return {
            ...rest,
            'Tanggal': new Date(r.Tanggal).toLocaleDateString('id-ID')
        };
    });
}
