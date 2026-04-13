
/**
 * REPORT SERVICES - ROBUST MATCHED TRACEABILITY
 */

export async function getProductTraceabilityService() {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    try {
        // 1. Fetch Sales Items with specific field selection to save memory
        const salesItems = await prisma.salesDeliveryItem.findMany({
            include: {
                product: { select: { sku: true, name: true, uom: true } },
                delivery: {
                    select: {
                        date: true,
                        createdAt: true,
                        deliveryNumber: true,
                        poNumber: true,
                        buyerName: true,
                        recipient: true,
                        taxRate: true,
                        notes: true,
                        warehouse: { select: { name: true } }
                    }
                }
            },
            orderBy: { delivery: { date: 'desc' } }
        });

        // 2. Fetch Purchase Items
        const purchaseItems = await prisma.goodsReceiptItem.findMany({
            include: {
                receipt: {
                    select: {
                        date: true,
                        createdAt: true,
                        receiptNumber: true,
                        formNumber: true,
                        receivedFrom: true,
                        taxRate: true,
                        warehouse: { select: { name: true } }
                    }
                }
            },
            orderBy: { receipt: { date: 'desc' } }
        });

        // 3. Build a Map for fast lookups (O(1))
        const purchaseMap = new Map();
        purchaseItems.forEach((pi: any) => {
            if (!pi.receipt) return;
            const key = `${pi.productId}_${pi.receipt.receivedFrom}`;
            if (!purchaseMap.has(key)) {
                purchaseMap.set(key, pi);
            }
        });

        const reportData: any[] = [];

        // 4. Pair Sales with their corresponding Purchases
        salesItems.forEach((si: any) => {
            if (!si.delivery || !si.product) return;

            const key = `${si.productId}_${si.vendorName}`;
            const match = purchaseMap.get(key);

            const buyTax = match?.receipt?.taxRate ? Number(match.receipt.taxRate) : 0;
            const sellTax = si.delivery.taxRate ? Number(si.delivery.taxRate) : 0;

            const buyPrice = match ? Number(match.purchasePrice || 0) : 0;
            const sellPrice = Number(si.salesPrice || 0);
            
            const buyTotal = Number(si.quantity || 0) * (buyPrice - Number(match?.discount || 0));
            const sellTotal = Number(si.quantity || 0) * (sellPrice - Number(si.discount || 0));

            const saleDate = si.delivery.date || si.delivery.createdAt;
            const buyDate = match?.receipt?.date || match?.receipt?.createdAt;

            reportData.push({
                'SKU': si.product.sku,
                'Nama Barang': si.product.name,
                'Satuan': si.product.uom || "PCS",
                
                // --- INFO PEMBELIAN (KIRI) ---
                '[BELI] Tgl': buyDate ? new Date(buyDate).toLocaleDateString('id-ID') : "-",
                '[BELI] No. LPB': match?.receipt?.receiptNumber || "-",
                '[BELI] No. SJ Supplier': match?.receipt?.formNumber || "-",
                '[BELI] Supplier': si.vendorName || match?.receipt?.receivedFrom || "UMUM",
                '[BELI] Harga Satuan': buyPrice,
                '[BELI] PPN (%)': buyTax > 0 ? `${buyTax}%` : "0%",
                
                // --- INFO PENJUALAN (KANAN) ---
                '_rawDate': saleDate, // Internal field for sorting
                '[JUAL] No. TRN': si.delivery.deliveryNumber || "-",
                '[JUAL] No. PO Buyer': si.delivery.poNumber || "-",
                '[JUAL] Buyer / Customer': si.delivery.buyerName || si.delivery.recipient || "UMUM",
                'Qty Jual': si.quantity || 0,
                '[JUAL] Harga Jual Satuan': sellPrice,
                '[JUAL] PPN (%)': sellTax > 0 ? `${sellTax}%` : "0%",
                '[JUAL] Total Nilai Jual': sellTotal,
                
                // --- ANALYSIS ---
                'Margin Estimasi (Rp)': sellTotal - buyTotal,
                'Gudang': si.delivery.warehouse?.name || match?.receipt?.warehouse?.name || "Pusat",
                'Catatan': si.delivery.notes || "-"
            });
        });

        // 5. Sort by internal Date field
        reportData.sort((a, b) => {
            if (!a._rawDate || !b._rawDate) return 0;
            return new Date(a._rawDate).getTime() - new Date(b._rawDate).getTime();
        });

        // 6. Final format
        return reportData.map(({ _rawDate, ...rest }) => ({
            ...rest,
            'Tanggal': _rawDate ? new Date(_rawDate).toLocaleDateString('id-ID') : "-"
        }));

    } catch (error: any) {
        console.error("[getProductTraceabilityService] CRITICAL ERROR:", error);
        throw error; // Rethrow so the action knows it failed
    }
}
