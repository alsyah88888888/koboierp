const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSalesDeliveries() {
  const deliveries = await prisma.salesDelivery.findMany({ include: { items: true } });
  let updatedCount = 0;
  for (const delivery of deliveries) {
    const subtotalExact = delivery.items.reduce((acc, i) => acc + (Number(i.quantity) * Number(i.salesPrice)) - Number(i.discount || 0), 0);
    const totalDiscountNominal = Number(delivery.totalDiscount) || 0;
    const taxRatePercent = Number(delivery.taxRate) || 0;
    
    const exactDpp = subtotalExact - totalDiscountNominal;
    const exactDppNilaiLain = taxRatePercent === 12 ? (exactDpp * (11 / 12)) : exactDpp;
    const exactTaxAmount = taxRatePercent > 0 ? (exactDppNilaiLain * (taxRatePercent / 100)) : 0;
    
    const subtotal = Math.round(subtotalExact);
    const taxAmount = Math.round(exactTaxAmount);
    const grandTotal = Math.round(exactDpp + exactTaxAmount);
    const dpp = Math.round(exactDpp);
    
    if (Number(delivery.grandTotal) !== grandTotal) {
      await prisma.salesDelivery.update({
        where: { id: delivery.id },
        data: { subtotal, taxAmount, grandTotal }
      });
      updatedCount++;
    }
  }
  console.log(`Fixed ${updatedCount} Sales Deliveries`);
}

async function fixSalesOrders() {
  const orders = await prisma.salesOrder.findMany({ include: { items: true } });
  let updatedCount = 0;
  for (const order of orders) {
    const subtotalExact = order.items.reduce((acc, i) => acc + (Number(i.quantity) * Number(i.salesPrice)) - Number(i.discount || 0), 0);
    const totalDiscountNominal = Number(order.totalDiscount) || 0;
    const taxRatePercent = Number(order.taxRate) || 0;
    
    const exactDpp = subtotalExact - totalDiscountNominal;
    const exactDppNilaiLain = taxRatePercent === 12 ? (exactDpp * (11 / 12)) : exactDpp;
    const exactTaxAmount = taxRatePercent > 0 ? (exactDppNilaiLain * (taxRatePercent / 100)) : 0;
    
    const subtotal = Math.round(subtotalExact);
    const taxAmount = Math.round(exactTaxAmount);
    const grandTotal = Math.round(exactDpp + exactTaxAmount);
    const dpp = Math.round(exactDpp);
    
    if (Number(order.grandTotal) !== grandTotal) {
      await prisma.salesOrder.update({
        where: { id: order.id },
        data: { subtotal, taxAmount, grandTotal }
      });
      updatedCount++;
    }
  }
  console.log(`Fixed ${updatedCount} Sales Orders`);
}

async function fixPurchaseReceipts() {
  const receipts = await prisma.goodsReceipt.findMany({ include: { items: true } });
  let updatedCount = 0;
  for (const receipt of receipts) {
    const subtotalExact = receipt.items.reduce((acc, i) => acc + (Number(i.quantity) * Number(i.purchasePrice)) - Number(i.discount || 0), 0);
    const totalDiscountNominal = Number(receipt.totalDiscount) || 0;
    const taxRatePercent = Number(receipt.taxRate) || 0;
    
    const exactDpp = subtotalExact - totalDiscountNominal;
    const exactDppNilaiLain = taxRatePercent === 12 ? (exactDpp * (11 / 12)) : exactDpp;
    const exactTaxAmount = taxRatePercent > 0 ? (exactDppNilaiLain * (taxRatePercent / 100)) : 0;
    
    const subtotal = Math.round(subtotalExact);
    const taxAmount = Math.round(exactTaxAmount);
    const grandTotal = Math.round(exactDpp + exactTaxAmount);
    
    if (Number(receipt.grandTotal) !== grandTotal) {
      await prisma.goodsReceipt.update({
        where: { id: receipt.id },
        data: { subtotal, taxAmount, grandTotal }
      });
      updatedCount++;
    }
  }
  console.log(`Fixed ${updatedCount} Purchase Receipts`);
}

async function fixPurchaseOrders() {
  const orders = await prisma.purchaseOrder.findMany({ include: { items: true } });
  let updatedCount = 0;
  for (const order of orders) {
    const subtotalExact = order.items.reduce((acc, i) => acc + (Number(i.quantity) * Number(i.purchasePrice)) - Number(i.discount || 0), 0);
    const totalDiscountNominal = Number(order.totalDiscount) || 0;
    const taxRatePercent = Number(order.taxRate) || 0;
    
    const exactDpp = subtotalExact - totalDiscountNominal;
    const exactDppNilaiLain = taxRatePercent === 12 ? (exactDpp * (11 / 12)) : exactDpp;
    const exactTaxAmount = taxRatePercent > 0 ? (exactDppNilaiLain * (taxRatePercent / 100)) : 0;
    
    const subtotal = Math.round(subtotalExact);
    const taxAmount = Math.round(exactTaxAmount);
    const grandTotal = Math.round(exactDpp + exactTaxAmount);
    
    if (Number(order.grandTotal) !== grandTotal) {
      await prisma.purchaseOrder.update({
        where: { id: order.id },
        data: { subtotal, taxAmount, grandTotal }
      });
      updatedCount++;
    }
  }
  console.log(`Fixed ${updatedCount} Purchase Orders`);
}

async function main() {
  await fixSalesDeliveries();
  await fixSalesOrders();
  await fixPurchaseReceipts();
  await fixPurchaseOrders();
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
