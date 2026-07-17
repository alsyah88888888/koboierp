import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

function num(d: any) { return d ? Number(d) : 0; }

async function showDelivery(deliveryNumber: string) {
    const sd = await prisma.salesDelivery.findFirst({
        where: { deliveryNumber },
        include: {
            items: {
                include: {
                    product: true,
                    lotAllocations: true,
                }
            },
            order: true,
        }
    });
    if (!sd) {
        console.log(`\n=== ${deliveryNumber} : NOT FOUND as SalesDelivery ===`);
        return;
    }
    console.log(`\n=== SalesDelivery ${sd.deliveryNumber} ===`);
    console.log(`Buyer: ${sd.buyerName} | Recipient: ${sd.recipient} | Date: ${sd.date.toISOString().slice(0,10)} | Invoice#: ${sd.invoiceNumber} | PO#: ${sd.poNumber} | Void: ${sd.isVoid}`);
    console.log(`Order#: ${sd.order?.orderNumber} | Proforma#: ${sd.order?.proformaNumber}`);
    let totalSales = 0, totalCost = 0;
    for (const item of sd.items) {
        const qty = item.quantity;
        const salesPrice = num(item.salesPrice);
        const discount = num(item.discount);
        const lineSales = qty * salesPrice - discount;
        const costPerUnit = item.lotAllocations.length > 0
            ? item.lotAllocations.reduce((sum, la) => sum + num(la.hppAtTime) * la.qty, 0) / item.lotAllocations.reduce((s, la) => s + la.qty, 0)
            : num(item.product.purchasePrice);
        const lineCost = item.lotAllocations.length > 0
            ? item.lotAllocations.reduce((sum, la) => sum + num(la.hppAtTime) * la.qty, 0)
            : qty * costPerUnit;
        totalSales += lineSales;
        totalCost += lineCost;
        const margin = lineSales - lineCost;
        const marginPct = lineSales !== 0 ? (margin / lineSales) * 100 : 0;
        console.log(`  - ${item.product.name} | qty=${qty} | sell=${salesPrice} disc=${discount} -> lineSales=${lineSales} | costPerUnit=${costPerUnit.toFixed(2)} lineCost=${lineCost.toFixed(2)} | margin=${margin.toFixed(2)} (${marginPct.toFixed(2)}%)`);
    }
    const totalMargin = totalSales - totalCost;
    const totalMarginPct = totalSales !== 0 ? (totalMargin / totalSales) * 100 : 0;
    console.log(`  TOTAL: sales=${totalSales.toFixed(2)} cost=${totalCost.toFixed(2)} margin=${totalMargin.toFixed(2)} (${totalMarginPct.toFixed(2)}%)`);
}

async function showOrder(orderNumber: string) {
    const so = await prisma.salesOrder.findFirst({
        where: {
            OR: [
                { orderNumber },
                { proformaNumber: orderNumber },
            ]
        },
        include: {
            items: { include: { product: true } },
            deliveries: true,
        }
    });
    if (!so) {
        console.log(`\n=== ${orderNumber} : NOT FOUND as SalesOrder/Proforma ===`);
        return;
    }
    console.log(`\n=== SalesOrder ${so.orderNumber} (proforma: ${so.proformaNumber}) ===`);
    console.log(`Buyer: ${so.buyerName} | Status: ${so.status} | Date: ${so.date.toISOString().slice(0,10)} | InvoiceNumber(locked): ${so.invoiceNumber}`);
    console.log(`Linked deliveries: ${so.deliveries.map(d => d.deliveryNumber).join(', ') || '(none yet)'}`);
    let totalSales = 0;
    for (const item of so.items) {
        const qty = item.quantity;
        const salesPrice = num(item.salesPrice);
        const discount = num(item.discount);
        const lineSales = qty * salesPrice - discount;
        totalSales += lineSales;
        const cost = num(item.product.purchasePrice);
        const lineCost = qty * cost;
        const margin = lineSales - lineCost;
        const marginPct = lineSales !== 0 ? (margin/lineSales)*100 : 0;
        console.log(`  - ${item.product.name} | qty=${qty} shipped=${item.shippedQuantity} | sell=${salesPrice} disc=${discount} -> lineSales=${lineSales} | product.purchasePrice(ref, not FIFO)=${cost} lineCost=${lineCost} | approxMargin=${margin.toFixed(2)} (${marginPct.toFixed(2)}%)`);
    }
    console.log(`  TOTAL SALES (order, approx): ${totalSales.toFixed(2)}`);
}

async function main() {
    await showDelivery('KB-TRN-24062026-010');
    await showDelivery('KB-TRN-26062026-005');
    await showDelivery('KB-TRN-15062026-005');
    await showOrder('KB-PI-15062026-003');
}

main().catch(console.error).finally(() => prisma.$disconnect());
