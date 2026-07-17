import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

function num(d: any) { return d ? Number(d) : 0; }

async function findByInvoice(inv: string) {
    console.log(`\n########## Searching: ${inv} ##########`);

    const deliveries = await prisma.salesDelivery.findMany({
        where: {
            OR: [
                { deliveryNumber: inv },
                { invoiceNumber: inv },
            ]
        },
        include: {
            items: { include: { product: true, lotAllocations: true } },
            order: true,
        }
    });

    if (deliveries.length === 0) {
        const orders = await prisma.salesOrder.findMany({
            where: {
                OR: [
                    { orderNumber: inv },
                    { proformaNumber: inv },
                    { invoiceNumber: inv },
                ]
            },
            include: { deliveries: true }
        });
        if (orders.length === 0) {
            console.log('  NOT FOUND anywhere (delivery or order)');
            return;
        }
        for (const o of orders) {
            console.log(`  Found as SalesOrder ${o.orderNumber} (status ${o.status}), invoiceNumber(locked)=${o.invoiceNumber}, deliveries linked: ${o.deliveries.map(d=>d.deliveryNumber).join(', ') || '(none)'}`);
            for (const d of o.deliveries) {
                await printDelivery(d.deliveryNumber);
            }
        }
        return;
    }

    for (const sd of deliveries) {
        await printDeliveryObj(sd);
    }
}

async function printDelivery(deliveryNumber: string) {
    const sd = await prisma.salesDelivery.findFirst({
        where: { deliveryNumber },
        include: { items: { include: { product: true, lotAllocations: true } }, order: true }
    });
    if (!sd) { console.log(`  delivery ${deliveryNumber} not found`); return; }
    await printDeliveryObj(sd);
}

async function printDeliveryObj(sd: any) {
    console.log(`\n=== SalesDelivery ${sd.deliveryNumber} (isVoid=${sd.isVoid}) ===`);
    console.log(`Buyer: ${sd.buyerName} | Recipient: ${sd.recipient} | Date: ${sd.date.toISOString().slice(0,10)} | Invoice#: ${sd.invoiceNumber} | Order#: ${sd.order?.orderNumber} | Proforma#: ${sd.order?.proformaNumber}`);
    let totalSales = 0, totalCost = 0;
    for (const item of sd.items) {
        const qty = item.quantity;
        const salesPrice = num(item.salesPrice);
        const discount = num(item.discount);
        const lineSales = qty * salesPrice - discount;
        const allocQty = item.lotAllocations.reduce((s: number, la: any) => s + la.qty, 0);
        const allocCost = item.lotAllocations.reduce((s: number, la: any) => s + num(la.hppAtTime) * la.qty, 0);
        const costPerUnit = allocQty > 0 ? allocCost / allocQty : num(item.product.purchasePrice);
        const lineCost = allocQty > 0 ? allocCost : qty * costPerUnit;
        totalSales += lineSales;
        totalCost += lineCost;
        const margin = lineSales - lineCost;
        const marginPct = lineSales !== 0 ? (margin / lineSales) * 100 : 0;
        console.log(`  - ${item.product.name} | qty=${qty} | sell/u=${salesPrice.toFixed(2)} disc=${discount} -> lineSales=${lineSales.toFixed(2)} | costPerUnit=${costPerUnit.toFixed(2)} (allocQty=${allocQty}) lineCost=${lineCost.toFixed(2)} | margin=${margin.toFixed(2)} (${marginPct.toFixed(2)}%)`);
    }
    const totalMargin = totalSales - totalCost;
    const totalMarginPct = totalSales !== 0 ? (totalMargin / totalSales) * 100 : 0;
    console.log(`  TOTAL: sales=${totalSales.toFixed(2)} cost=${totalCost.toFixed(2)} margin=${totalMargin.toFixed(2)} (${totalMarginPct.toFixed(2)}%)`);
}

async function main() {
    await findByInvoice('KB-TRN-24062026-010');
    await findByInvoice('KB-TRN-26062026-005');
    await findByInvoice('KB-TRN-15062026-005');
    await findByInvoice('KB-PI-15062026-003');
}

main().catch(console.error).finally(() => prisma.$disconnect());
