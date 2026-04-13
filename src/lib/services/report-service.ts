
/**
 * REPORT SERVICES - SUPER INTEGRATED (MATCHED BUY/SELL)
 */

export async function getProductTraceabilityService() {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    // 1. Fetch all Sales Items with full context
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

    // 2. Fetch all Purchase Items with full context
    const purchaseItems = await prisma.goodsReceiptItem.findMany({
        include: {
            product: true,
            receipt: {
                include: {
                    warehouse: true
                }
            }
        },
        orderBy: { receipt: { date: 'desc' } }
    });

    const reportData: any[] = [];

    // 3. Process each Sale and Match it with its Purchase source
    salesItems.forEach((si: any) => {
        // Find the matching purchase based on Product + VendorName selected in SJ
        // We look for the most relevant purchase from that supplier
        const match = purchaseItems.find((pi: any) => 
            pi.productId === si.productId && 
            pi.receipt.receivedFrom === si.vendorName
        );

        const buyTax = match ? Number(match.receipt.taxRate || 0) * 100 : 0;
        const sellTax = Number(si.delivery.taxRate || 0) * 100;

        const buyPrice = match ? Number(match.purchasePrice) : 0;
        const sellPrice = Number(si.salesPrice || 0);
        
        const buyTotal = Number(si.quantity) * (buyPrice - Number(match?.discount || 0));
        const sellTotal = Number(si.quantity) * (sellPrice - Number(si.discount || 0));

        reportData.push({
            'SKU': si.product.sku,
            'Nama Barang': si.product.name,
            'Satuan': si.product.uom || "PCS",
            
            // --- INFO PEMBELIAN (LPB/LPBD) ---
            '[BELI] Tgl': match ? (match.receipt.date || match.receipt.createdAt).toLocaleDateString('id-ID') : "-",
            '[BELI] No. LPB': match ? match.receipt.receiptNumber : "-",
            '[BELI] No. SJ Supplier': match ? (match.receipt.formNumber || "-") : "-",
            '[BELI] Supplier': si.vendorName || (match ? match.receipt.receivedFrom : "UMUM"),
            '[BELI] Qty': match ? match.quantity : 0, // Total bought in that LPB
            '[BELI] Harga Satuan': buyPrice,
            '[BELI] PPN (%)': buyTax > 0 ? `${buyTax}%` : "0%",
            
            // --- INFO PENJUALAN (TRN/TRD) ---
            '[JUAL] Tgl': (si.delivery.date || si.delivery.createdAt).toLocaleDateString('id-ID'),
            '[JUAL] No. TRN': si.delivery.deliveryNumber,
            '[JUAL] No. PO Buyer': si.delivery.poNumber || "-",
            '[JUAL] Buyer / Customer': si.delivery.buyerName || si.delivery.recipient || "UMUM",
            '[JUAL] Sales (BC/PF)': si.delivery.salesPerson || "-",
            '[JUAL] Qty Jual': si.quantity,
            '[JUAL] Harga Jual Satuan': sellPrice,
            '[JUAL] PPN (%)': sellTax > 0 ? `${sellTax}%` : "0%",
            '[JUAL] Total Nilai Jual': sellTotal,
            
            // --- ANALYSIS ---
            'Margin Estimasi (Rp)': sellTotal - buyTotal,
            'Gudang': si.delivery.warehouse?.name || "Pusat",
            'Catatan': si.delivery.notes || "-"
        });
    });

    // Sort all movements by Date
    reportData.sort((a, b) => new Date(a.Tanggal).getTime() - new Date(b.Tanggal).getTime());

    // Format final object for Excel
    return reportData.map((r: any) => ({
        ...r,
        'Tanggal': new Date(r.Tanggal).toLocaleDateString('id-ID')
    }));
}
