import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const { updateSalesOrderService } = require('./src/lib/services/sales-service');
    const d = await prisma.salesOrder.findFirst({ where: { orderNumber: "KB-PI-21082026-001" }, include: { items: true } });
    if (!d) return;

    // Simulate editing WITH DIFFERENT DATE
    const data = {
        buyerName: d.buyerName,
        recipient: d.recipient,
        warehouseId: d.warehouseId,
        date: new Date('2026-08-20T00:00:00Z'), // DIFFERENT DATE
        salesPerson: d.salesPerson,
        items: d.items.map((i: any) => ({
            ...i,
            salesPrice: Number(i.salesPrice)
        })),
        taxRate: d.taxRate,
        totalDiscount: d.totalDiscount,
        status: d.status
    };

    console.log("Updating PI with new date...");
    await updateSalesOrderService(d.id, data);
    
    const after = await prisma.salesOrder.findFirst({ where: { id: d.id } });
    console.log("After update:", after.orderNumber, after.proformaNumber, after.date);
}
main();
