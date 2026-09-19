import { PrismaClient } from '@prisma/client';
import { serializeDecimal } from './src/lib/utils';
const prisma = new PrismaClient();
prisma.purchaseRequest.findFirst({
    include: { items: true, requestedBy: true }
}).then(r => {
    if (!r) return console.log("No data");
    
    // Simulate what serializeDecimal does (mock since it failed importing before)
    const items = r.items.map((i: any) => ({
        ...i,
        estimatedPrice: Number(i.estimatedPrice)
    }));
    
    const data: any[] = [];
    if (!items || items.length === 0) {
        console.log("No items in this request");
    } else {
        items.forEach((i: any) => {
            data.push({
                'No. Pengajuan': r.number,
                'Deskripsi Barang / Kebutuhan': i.itemName,
                'Qty': i.quantity,
                'Estimasi Harga': Number(i.estimatedPrice),
                'Total Estimasi': i.quantity * Number(i.estimatedPrice)
            });
        });
    }
    console.log(data);
}).finally(() => prisma.$disconnect());
