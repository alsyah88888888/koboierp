
/**
 * REPORT SERVICES - TRACEABILITY (CONNECTED PURCHASE & SALES)
 */

export async function getProductTraceabilityService() {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    // Fetch all products with their transactions, including warehouse details
    const products = await prisma.product.findMany({
        include: {
            receiptItems: {
                include: {
                    receipt: {
                        include: {
                            warehouse: true
                        }
                    }
                }
            },
            salesItems: {
                include: {
                    delivery: {
                        include: {
                            warehouse: true
                        }
                    }
                }
            }
        },
        orderBy: { name: 'asc' }
    });

    const reportData: any[] = [];

    products.forEach((product: any) => {
        // Collect Purchases (Masuk - LPBD/LPB)
        product.receiptItems.forEach((ri: any) => {
            const taxRate = Number(ri.receipt.taxRate || 0) * 100;
            reportData.push({
                'SKU': product.sku,
                'Nama Barang': product.name,
                'Tanggal': ri.receipt.date || ri.receipt.createdAt,
                'Jenis Transaksi': 'MASUK (BELI)',
                'No. Dokumen Internal': ri.receipt.receiptNumber,
                'No. Dokumen Eksternal (SJ Supplier)': ri.receipt.formNumber || "-",
                'Pihak Terkait (Supplier/Customer)': ri.receipt.receivedFrom,
                'Sales Person (BC/PF)': ri.receipt.salesPerson || "-",
                'Quantity': ri.quantity,
                'Satuan': product.uom || "PCS",
                'Harga Beli Satuan': Number(ri.purchasePrice),
                'Harga Jual Satuan': 0,
                'Diskon': Number(ri.discount || 0),
                'PPN (%)': taxRate > 0 ? `${taxRate}%` : "0%",
                'Total Nilai (Net)': Number(ri.quantity) * (Number(ri.purchasePrice) - Number(ri.discount || 0)),
                'Gudang': ri.receipt.warehouse?.name || "Pusat",
                'Catatan': ri.receipt.notes || "-"
            });
        });

        // Collect Sales (Keluar - TRN/TRD)
        product.salesItems.forEach((si: any) => {
            const taxRate = Number(si.delivery.taxRate || 0) * 100;
            reportData.push({
                'SKU': product.sku,
                'Nama Barang': product.name,
                'Tanggal': si.delivery.date || si.delivery.createdAt,
                'Jenis Transaksi': 'KELUAR (JUAL)',
                'No. Dokumen Internal': si.delivery.deliveryNumber,
                'No. Dokumen Eksternal (PO Customer)': si.delivery.poNumber || "-",
                'Pihak Terkait (Supplier/Customer)': si.delivery.buyerName || si.delivery.recipient || 'UMUM',
                'Sales Person (BC/PF)': si.delivery.salesPerson || "-",
                'Quantity': si.quantity,
                'Satuan': product.uom || "PCS",
                'Harga Beli Satuan': 0,
                'Harga Jual Satuan': Number(si.salesPrice || 0),
                'Diskon': Number(si.discount || 0),
                'PPN (%)': taxRate > 0 ? `${taxRate}%` : "0%",
                'Total Nilai (Net)': Number(si.quantity) * (Number(si.salesPrice || 0) - Number(si.discount || 0)),
                'Gudang': si.delivery.warehouse?.name || "Pusat",
                'Catatan': si.delivery.notes || "-"
            });
        });
    });

    // Sort all movements by Date
    reportData.sort((a, b) => new Date(a.Tanggal).getTime() - new Date(b.Tanggal).getTime());

    // Format final object for Excel
    return reportData.map(r => ({
        ...r,
        'Tanggal': new Date(r.Tanggal).toLocaleDateString('id-ID')
    }));
}
