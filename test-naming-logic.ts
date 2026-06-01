// Intercept require to mock 'next/cache' when running in standalone Node.js environment
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id: any) {
    if (id === 'next/cache') {
        return {
            revalidatePath: () => {},
            revalidateTag: () => {},
        };
    }
    return originalRequire.apply(this, arguments);
};

const { PrismaClient } = require('@prisma/client');
const { createSalesDeliveryService } = require('./src/lib/services/sales-service');

const testPrisma = new PrismaClient();

async function runTest() {
    console.log("\n=== MULAI PENGUJIAN OTOMATISASI PENOMORAN SJ & INVOICE ===");
    
    // Cari user aktif untuk pengujian
    const user = await testPrisma.user.findFirst();
    if (!user) {
        throw new Error("User tidak ditemukan untuk pengujian!");
    }
    const userId = user.id;
    console.log(`Menggunakan User: ${user.name || user.email} (ID: ${userId})`);

    // 1. Membuat data master bayangan untuk pengujian
    console.log("1. Membuat data master bayangan (Customer & Produk)...");
    const customer = await testPrisma.customer.create({
        data: {
            name: "TEST BUYER AUTOMATION",
            code: "TBA-" + Date.now(),
        }
    });
    
    const product = await testPrisma.product.create({
        data: {
            name: "TEST PRODUCT OREO",
            sku: "TEST-OREO-" + Date.now(),
            salesPrice: 15000,
            uom: "KARTON",
            purchasePrice: 10000,
        }
    });
    
    // Cari warehouse untuk pengujian
    const warehouse = await testPrisma.warehouse.findFirst();
    if (!warehouse) {
        throw new Error("Gudang tidak ditemukan untuk pengujian!");
    }
    
    // Tambahkan stok awal agar transaksi berhasil
    await testPrisma.stock.create({
        data: {
            productId: product.id,
            warehouseId: warehouse.id,
            vendorName: "UMUM",
            quantity: 100,
        }
    });
    
    // 2. Membuat PO (Sales Order) bayangan
    console.log("2. Membuat PO Penjualan Bayangan...");
    const orderNumber = `TEST-PO-${Date.now()}`;
    const order = await testPrisma.salesOrder.create({
        data: {
            orderNumber,
            buyerName: customer.name,
            recipient: "Jl. Test Automation No. 12",
            warehouseId: warehouse.id,
            subtotal: 1500000,
            grandTotal: 1500000,
            status: "OPEN",
            poNumber: "PO-BUYER-MOCK-999",
            items: {
                create: {
                    productId: product.id,
                    quantity: 100,
                    salesPrice: 15000,
                }
            }
        },
        include: { items: true }
    });
    
    // 3. Mensimulasikan pengiriman pertama (parsial 30 unit)
    console.log("\n3. Mensimulasikan Pengiriman Pertama (30 unit Oreo)...");
    const firstDeliveryRes = await createSalesDeliveryService({
        orderId: order.id,
        recipient: order.recipient,
        buyerName: order.buyerName,
        poNumber: order.poNumber,
        warehouseId: warehouse.id,
        salesPerson: "BC",
        isPKP: false,
        totalDiscount: 0,
        taxRate: 0,
        createdAt: new Date(),
        items: [{
            productId: product.id,
            quantity: 30,
            salesPrice: 15000,
            discount: 0,
            uom: "KARTON",
            vendorName: "UMUM",
            orderItemId: order.items[0].id
        }]
    }, userId);
    
    console.log("Hasil Pengiriman Pertama:");
    console.log(`- Status: ${firstDeliveryRes.success ? "SUKSES" : "GAGAL"}`);
    console.log(`- No. Surat Jalan (deliveryNumber): ${firstDeliveryRes.deliveryNumber}`);
    
    const delivery1 = await testPrisma.salesDelivery.findUnique({
        where: { deliveryNumber: firstDeliveryRes.deliveryNumber }
    });
    console.log(`- No. Penagihan / Invoice: ${delivery1?.invoiceNumber}`);
    
    // 4. Mensimulasikan pengiriman kedua (parsial 40 unit)
    console.log("\n4. Mensimulasikan Pengiriman Kedua (40 unit Oreo - Parsial)...");
    const secondDeliveryRes = await createSalesDeliveryService({
        orderId: order.id,
        recipient: order.recipient,
        buyerName: order.buyerName,
        poNumber: order.poNumber,
        warehouseId: warehouse.id,
        salesPerson: "BC",
        isPKP: false,
        totalDiscount: 0,
        taxRate: 0,
        createdAt: new Date(),
        items: [{
            productId: product.id,
            quantity: 40,
            salesPrice: 15000,
            discount: 0,
            uom: "KARTON",
            vendorName: "UMUM",
            orderItemId: order.items[0].id
        }]
    }, userId);
    
    console.log("Hasil Pengiriman Kedua:");
    console.log(`- Status: ${secondDeliveryRes.success ? "SUKSES" : "GAGAL"}`);
    console.log(`- No. Surat Jalan (deliveryNumber): ${secondDeliveryRes.deliveryNumber}`);
    
    const delivery2 = await testPrisma.salesDelivery.findUnique({
        where: { deliveryNumber: secondDeliveryRes.deliveryNumber }
    });
    console.log(`- No. Penagihan / Invoice: ${delivery2?.invoiceNumber}`);
    
    // 5. Evaluasi Hasil Pengujian (Verifikasi & Assertions)
    console.log("\n=== EVALUASI DAN HASIL PENGUJIAN ===");
    const randomNum1 = firstDeliveryRes.deliveryNumber.split('-')[1];
    const randomNum2 = secondDeliveryRes.deliveryNumber.split('-')[1];
    
    const isInvoiceMatching = delivery1?.invoiceNumber === delivery2?.invoiceNumber;
    const isSjUnique = firstDeliveryRes.deliveryNumber !== secondDeliveryRes.deliveryNumber;
    const isRandomMatching = randomNum1 === randomNum2;
    const isSjSequenceCorrect = firstDeliveryRes.deliveryNumber.endsWith("-001") && secondDeliveryRes.deliveryNumber.endsWith("-002");
    
    console.log(`- Kedua Pengiriman Parsial memakai nomor Invoice yang SAMA: ${isInvoiceMatching ? "✅ BERHASIL" : "❌ GAGAL"}`);
    console.log(`- Fisik No. Surat Jalan UNIK (berbeda): ${isSjUnique ? "✅ BERHASIL" : "❌ GAGAL"}`);
    console.log(`- Nomor acak SJ SAMA (${randomNum1}): ${isRandomMatching ? "✅ BERHASIL" : "❌ GAGAL"}`);
    console.log(`- Nomor urut SJ berurutan secara benar (-001 dan -002): ${isSjSequenceCorrect ? "✅ BERHASIL" : "❌ GAGAL"}`);
    
    // 6. Pembersihan data pengujian dari database
    console.log("\n6. Membersihkan kembali data pengujian dari database...");
    
    // Hapus alokasi lot
    await testPrisma.lotAllocation.deleteMany({
        where: { sdItem: { delivery: { orderId: order.id } } }
    });
    
    // Hapus item pengiriman
    await testPrisma.salesDeliveryItem.deleteMany({
        where: { delivery: { orderId: order.id } }
    });
    
    // Hapus pengiriman sales delivery
    await testPrisma.salesDelivery.deleteMany({
        where: { orderId: order.id }
    });
    
    // Hapus sales order items
    await testPrisma.salesOrderItem.deleteMany({
        where: { orderId: order.id }
    });
    
    // Hapus sales order
    await testPrisma.salesOrder.delete({
        where: { id: order.id }
    });
    
    // Hapus pergerakan stok (StockMovement)
    await testPrisma.stockMovement.deleteMany({
        where: { productId: product.id }
    });
    
    // Hapus stok produk
    await testPrisma.stock.deleteMany({
        where: { productId: product.id }
    });
    
    // Hapus produk
    await testPrisma.product.delete({
        where: { id: product.id }
    });
    
    // Hapus customer
    await testPrisma.customer.delete({
        where: { id: customer.id }
    });
    
    console.log("\n=== PENGUJIAN SELESAI DENGAN SUKSES ===");
}

runTest()
    .catch(e => console.error("Pengujian gagal dengan error:", e))
    .finally(() => testPrisma.$disconnect());
