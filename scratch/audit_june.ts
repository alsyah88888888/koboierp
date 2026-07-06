import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkJune() {
    const startDate = new Date('2026-06-01T00:00:00.000Z');
    const endDate = new Date('2026-06-30T23:59:59.999Z');

    const deliveries = await prisma.salesDelivery.findMany({
        where: {
            date: {
                gte: startDate,
                lte: endDate
            },
            isVoid: false
        },
        include: {
            items: {
                include: {
                    lotAllocations: {
                        include: {
                            lot: {
                                include: {
                                    grItem: {
                                        include: {
                                            receipt: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    let mismatches = 0;

    for (const sd of deliveries) {
        let pfQty = 0;
        let bcQty = 0;

        for (const item of sd.items) {
            for (const alloc of item.lotAllocations) {
                const receiptSP = alloc.lot.grItem.receipt.salesPerson;
                if (receiptSP === 'PF') pfQty += alloc.qty;
                if (receiptSP === 'BC') bcQty += alloc.qty;
            }
        }

        if (pfQty === 0 && bcQty === 0) continue;

        let majority = pfQty >= bcQty ? 'PF' : 'BC';
        
        if (sd.salesPerson !== majority) {
            console.log(`Mismatch SD: ${sd.deliveryNumber}, SD Sales: ${sd.salesPerson}, Majority Receipt: ${majority}`);
            mismatches++;
        }
    }

    const orders = await prisma.salesOrder.findMany({
        where: {
            date: {
                gte: startDate,
                lte: endDate
            },
            status: { not: "VOID" }
        },
        include: {
            deliveries: {
                where: { isVoid: false }
            }
        }
    });

    for (const order of orders) {
        if (order.deliveries && order.deliveries.length > 0) {
            const validDelivery = order.deliveries[0];
            if (order.salesPerson !== validDelivery.salesPerson) {
                console.log(`Mismatch SO: ${order.orderNumber}, SO Sales: ${order.salesPerson}, SD Sales: ${validDelivery.salesPerson}`);
                mismatches++;
            }
        }
    }

    console.log(`Total Mismatches Found: ${mismatches}`);
}

checkJune().catch(console.error).finally(() => prisma.$disconnect());
