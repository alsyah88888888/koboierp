const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const deliveryNumber = "SJ-310-11062026-001";
  console.log(`=== BREAKDOWN HPP UNTUK SJ: ${deliveryNumber} ===`);

  const sd = await prisma.salesDelivery.findUnique({
    where: { deliveryNumber },
    include: {
      items: {
        include: {
          product: true,
          lotAllocations: {
            include: {
              lot: true
            }
          }
        }
      }
    }
  });

  if (!sd) {
    console.log("Surat Jalan tidak ditemukan.");
    return;
  }

  console.log(`SJ ID: ${sd.id}`);
  console.log(`Buyer: ${sd.buyerName}`);
  console.log(`Total Qty: ${sd.items.reduce((acc, item) => acc + item.quantity, 0)}`);
  console.log(`Grand Total: ${sd.grandTotal}`);
  
  let totalHppComputed = 0;

  sd.items.forEach((item, index) => {
    console.log(`\nItem #${index + 1}: ${item.product.name} (SKU: ${item.product.sku})`);
    console.log(`  Qty Jual di SJ: ${item.quantity}`);
    console.log(`  Sales Price (per unit): ${item.salesPrice}`);
    console.log(`  Discount (line): ${item.discount}`);

    if (item.lotAllocations && item.lotAllocations.length > 0) {
      console.log(`  Alokasi Lot FIFO:`);
      item.lotAllocations.forEach((alloc, aIdx) => {
        const lot = alloc.lot;
        const lotQty = alloc.qty;
        const hppAtTime = Number(alloc.hppAtTime);
        const subtotalHpp = lotQty * hppAtTime;
        totalHppComputed += subtotalHpp;

        console.log(`    - Alokasi #${aIdx + 1}:`);
        console.log(`      * Qty Terambil dari Lot: ${lotQty}`);
        console.log(`      * Lot Number: ${lot?.lotNumber || 'N/A'}`);
        console.log(`      * GR/LPB Asal: ${lot?.grNumber || 'N/A'}`);
        console.log(`      * Purchase Price di Lot: ${lot?.purchasePrice}`);
        console.log(`      * Landed Cost di Lot: ${lot?.landedCost}`);
        console.log(`      * HPP Terpakai (hppAtTime): Rp ${hppAtTime.toLocaleString('id-ID')}`);
        console.log(`      * Subtotal HPP Alokasi: Rp ${subtotalHpp.toLocaleString('id-ID')} (${lotQty} x Rp ${hppAtTime})`);
      });
    } else {
      const fallbackPrice = Number(item.product.purchasePrice);
      const subtotalHpp = item.quantity * fallbackPrice;
      totalHppComputed += subtotalHpp;
      console.log(`  Alokasi Lot FIFO: TIDAK ADA ALOKASI LOT (Fallback ke harga beli default)`);
      console.log(`    * Fallback Purchase Price: Rp ${fallbackPrice.toLocaleString('id-ID')}`);
      console.log(`    * Subtotal HPP: Rp ${subtotalHpp.toLocaleString('id-ID')} (${item.quantity} x Rp ${fallbackPrice})`);
    }
  });

  console.log(`\n=============================================`);
  console.log(`Total HPP Hasil Kalkulasi Script: Rp ${totalHppComputed.toLocaleString('id-ID')}`);
  console.log(`=============================================`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
