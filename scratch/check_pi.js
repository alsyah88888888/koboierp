const { getPrisma } = require("../src/lib/prisma");

async function checkPi() {
    const prisma = getPrisma();
    const order = await prisma.salesOrder.findFirst({
        where: {
            orderNumber: "KB-PI-29052026-001"
        },
        include: {
            items: {
                include: {
                    product: true
                }
            }
        }
    });

    if (!order) {
        console.log("Order KB-PI-29052026-001 not found!");
        return;
    }

    console.log("=== SALES ORDER DETAILS ===");
    console.log("ID:", order.id);
    console.log("Order Number:", order.orderNumber);
    console.log("Buyer Name:", order.buyerName);
    console.log("Date:", order.date);
    console.log("Subtotal (Stored):", Number(order.subtotal));
    console.log("Total Discount (Stored):", Number(order.totalDiscount));
    console.log("Tax Rate (%):", Number(order.taxRate));
    console.log("Tax Amount (Stored):", Number(order.taxAmount));
    console.log("Grand Total (Stored):", Number(order.grandTotal));
    console.log("Status:", order.status);

    console.log("\n=== ITEMS ===");
    let calculatedBrutto = 0;
    let calculatedItemDiscount = 0;
    order.items.forEach((item, index) => {
        const qty = Number(item.quantity);
        const price = Number(item.salesPrice);
        const disc = Number(item.discount || 0);
        const lineBrutto = qty * price;
        const lineNetto = lineBrutto - disc;
        calculatedBrutto += lineBrutto;
        calculatedItemDiscount += disc;

        console.log(`Item #${index + 1}:`);
        console.log(`  Product SKU: ${item.product?.sku} (${item.product?.name})`);
        console.log(`  Qty: ${qty}`);
        console.log(`  Sales Price: ${price}`);
        console.log(`  Item Discount: ${disc}`);
        console.log(`  Line Brutto: ${lineBrutto}`);
        console.log(`  Line Netto: ${lineNetto}`);
    });

    console.log("\n=== MANUAL RE-CALCULATION ===");
    const subtotal = Math.round(calculatedBrutto - calculatedItemDiscount);
    const dpp = subtotal - Number(order.totalDiscount);
    const dppNilaiLain = order.taxRate > 0 ? Math.round(dpp * 0.916666666666667) : 0;
    const taxAmount = order.taxRate > 0 ? Math.floor(dppNilaiLain * 0.12) : 0;
    
    // Nearest thousand (old logic)
    const grandTotal1000 = Math.round((dpp + taxAmount) / 1000) * 1000;
    // Nearest hundred ceiling (new logic)
    const grandTotal100 = Math.ceil((dpp + taxAmount) / 100) * 100;

    console.log("Calculated Subtotal (Brutto - Item Discs):", subtotal);
    console.log("Calculated DPP (Subtotal - Global Disc):", dpp);
    console.log("Calculated DPP Nilai Lain:", dppNilaiLain);
    console.log("Calculated Tax (12% of DPP Nilai Lain):", taxAmount);
    console.log("DPP + Tax:", dpp + taxAmount);
    console.log("Grand Total (Nearest 1000):", grandTotal1000);
    console.log("Grand Total (Ceil 100):", grandTotal100);
}

checkPi().catch(console.error);
