import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
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

    let fixedCount = 0;

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
            console.log(`Mengoreksi SJ: ${sd.deliveryNumber} dari ${sd.salesPerson} menjadi ${majority} (PF: ${pfQty}, BC: ${bcQty})`);
            await prisma.salesDelivery.update({
                where: { id: sd.id },
                data: { salesPerson: majority }
            });
            fixedCount++;
        }
    }

    console.log(`\nEKSEKUSI SELESAI.`);
    console.log(`Total ${fixedCount} Surat Jalan berhasil dikoreksi kepemilikannya!`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
