
import { getPrisma } from "./src/lib/prisma.ts";
import fs from "fs";

async function debug() {
    const prisma = getPrisma();
    const results: any[] = [];
    
    const sjs = await prisma.salesDelivery.findMany({
        where: { deliveryNumber: { in: ["KB-TRN-07042026-003", "KB-TRN-07042026-008"] } },
        include: { items: { include: { product: true } } }
    });

    results.push("=== SALES DELIVERIES ===");
    sjs.forEach((sj: any) => {
        results.push(`SJ: ${sj.deliveryNumber}`);
        sj.items.forEach((item: any) => {
            results.push(`  - Product: ${item.product.name} | QTY: ${item.quantity}`);
        });
    });

    const lpbs = await prisma.goodsReceipt.findMany({
        where: { receiptNumber: { in: ["KB-LPB-07042026-003", "KB-LPB-07042026-008"] } },
        include: { items: { include: { product: true } } }
    });

    results.push("\n=== GOODS RECEIPTS ===");
    lpbs.forEach((lpb: any) => {
        results.push(`LPB: ${lpb.receiptNumber}`);
        lpb.items.forEach((item: any) => {
            results.push(`  - Product: ${item.product.name} | QTY: ${item.quantity}`);
        });
    });

    fs.writeFileSync("debug_output.txt", results.join("\n"));
    process.exit(0);
}

debug();
