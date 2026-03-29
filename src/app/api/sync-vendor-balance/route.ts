import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/sync-vendor-balance
 * Recalculate all vendor balances from receipt data to fix discrepancies.
 * vendor.balance should = SUM(grandTotal - paidAmount) where paymentStatus != 'PAID'
 */
export async function GET() {
    try {
        // 1. Get all receipts grouped by vendor name
        const receipts = await prisma.goodsReceipt.findMany({
            select: {
                receivedFrom: true,
                grandTotal: true,
                paidAmount: true,
                paymentStatus: true
            }
        });

        // 2. Calculate correct balance per vendor
        const balanceMap: Record<string, number> = {};
        for (const r of receipts) {
            const vendor = r.receivedFrom?.trim();
            if (!vendor) continue;
            if (!balanceMap[vendor]) balanceMap[vendor] = 0;

            // Only count receipts that still have outstanding balance (not fully paid)
            if (r.paymentStatus !== "PAID") {
                const outstanding = Number(r.grandTotal || 0) - Number(r.paidAmount || 0);
                balanceMap[vendor] += Math.max(0, outstanding);
            }
        }

        // 3. Update each vendor
        const results: { vendor: string; oldBalance: number; newBalance: number }[] = [];

        for (const [vendorName, correctBalance] of Object.entries(balanceMap)) {
            const vendor = await prisma.vendor.findFirst({
                where: { name: { equals: vendorName, mode: "insensitive" } }
            });
            if (!vendor) continue;

            const oldBalance = Number(vendor.balance || 0);
            await prisma.vendor.update({
                where: { id: vendor.id },
                data: { balance: correctBalance }
            });

            results.push({ vendor: vendorName, oldBalance, newBalance: correctBalance });
        }

        // 4. Zero out vendors with no receipts
        const allVendors = await prisma.vendor.findMany({ select: { id: true, name: true, balance: true } });
        for (const v of allVendors) {
            if (!balanceMap[v.name] && Number(v.balance) !== 0) {
                await prisma.vendor.update({ where: { id: v.id }, data: { balance: 0 } });
                results.push({ vendor: v.name, oldBalance: Number(v.balance), newBalance: 0 });
            }
        }

        return NextResponse.json({
            success: true,
            message: `Sinkronisasi selesai. ${results.length} vendor diperbarui.`,
            results
        });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
